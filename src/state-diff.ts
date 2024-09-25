import fs from "fs";
import path from "path";

import { convertStringToBase64 } from "./convert";
import * as functionTriggers from "./function-triggers";
import * as functions from "./functions";
import { Spec } from "./sb-yaml";
import * as subgraphs from "./subgraphs";
import * as webhooks from "./webhooks";
import { blobToBase64, zipFolder } from "./zip-tools";

type StateComparisonResult = {
    subgraphs: ResourceStateChanges;
    webhooks: ResourceStateChanges;
    functions: ResourceStateChanges;
};

function findWebhookById(webhookId: string, webhooks: ResourceStateChanges) {
    return [...webhooks.added, ...webhooks.changed, ...webhooks.unchanged, ...webhooks.unreferenced].find(
        (webhook: any) => webhook.webhook_id === webhookId,
    );
}

function findWebhookByName(webhookName: string, webhooks: ResourceStateChanges) {
    return [...webhooks.added, ...webhooks.changed, ...webhooks.unchanged, ...webhooks.unreferenced].find(
        (webhook: any) => webhook.webhook_name === webhookName,
    );
}

function newResourceStateChanges() {
    return {
        added: [],
        changed: [],
        unchanged: [],
        unreferenced: [],
    };
}

function should_send_std_streams(should_send_std_streams: any) {
    return should_send_std_streams === false ? false : true;
}

export async function generateStateChanges(spec: Spec) {
    // compare the state of the functions and webhooks in the yaml files with the
    // state of the functions and webhooks in the SendBlocks, then print the differences
    console.log("Comparing state...");

    const result: StateComparisonResult = {
        subgraphs: newResourceStateChanges(),
        webhooks: newResourceStateChanges(),
        functions: newResourceStateChanges(),
    };

    // subgraphs

    let sendblocksSubgraphs: {
        [name: string]: any;
    };
    try {
        sendblocksSubgraphs = await subgraphs.getSubgraphDictionary();
    } catch (error) {
        throw new Error(`Error occurred while fetching subgraphs: ${error}`);
    }
    for (const specItem in spec.subgraphs) {
        const specSubgraph = spec.subgraphs[specItem];
        // replace the spec's schema file reference with the graphql schema itself
        specSubgraph.schema = convertStringToBase64(fs.readFileSync(path.resolve(specSubgraph.schema)).toString());

        const sendblocksSubgraphName = sendblocksSubgraphs[specItem];
        if (!sendblocksSubgraphName) {
            result.subgraphs.added.push({
                schema_name: specItem,
                schema: specSubgraph.schema,
            });
        } else {
            // if the schema is in the sendblocksSubgraphs, retrieve the existing schema
            // and check if the schema has changed
            if (Object.keys(sendblocksSubgraphs).includes(specItem)) {
                const sendblocksSubgraph = (await subgraphs.getSubgraphSchema(specItem)).data;
                if (subgraphs.isSubgraphChanged(specItem, sendblocksSubgraph, specSubgraph)) {
                    result.subgraphs.changed.push({
                        schema_name: specItem,
                        schema: specSubgraph.schema,
                    });
                } else {
                    result.subgraphs.unchanged.push({
                        schema_name: specItem,
                    });
                }
            }
        }
    }
    for (const schema_name in sendblocksSubgraphs) {
        if (!Object.keys(spec.subgraphs).includes(schema_name)) {
            result.webhooks.unreferenced.push({
                schema_name: schema_name,
            });
        }
    }

    // webhooks

    let sendblocksWebhooks: {
        [name: string]: any;
    };
    try {
        sendblocksWebhooks = await webhooks.getWebhookDictionary();
    } catch (error) {
        throw new Error(`Error occurred while fetching webhooks: ${error}`);
    }
    for (const specItem in spec.webhooks) {
        const specWebhook = spec.webhooks[specItem];

        const sendblocksWebhook = sendblocksWebhooks[specItem];
        if (!sendblocksWebhook) {
            result.webhooks.added.push({
                webhook_name: specItem,
                url: specWebhook.url,
                secret: specWebhook.secret,
            });
        } else {
            // if the webhook is in the sendblocksWebhooks, check if the webhook has changed
            if (Object.keys(sendblocksWebhooks).includes(specItem)) {
                if (webhooks.isWebhookChanged(specItem, sendblocksWebhook, specWebhook)) {
                    result.webhooks.changed.push({
                        webhook_name: specItem,
                        url: specWebhook.url,
                        changes: [
                            sendblocksWebhook.url !== specWebhook.url ? `url (currently ${sendblocksWebhook.url})` : "",
                            sendblocksWebhook.secret !== specWebhook.secret ? "secret" : "",
                        ]
                            .filter((change) => {
                                return change.length > 0;
                            })
                            .join(", "),
                        secretChanged: specWebhook.secret !== sendblocksWebhook.secret,
                        secret: specWebhook.secret,
                        webhook_id: sendblocksWebhook.webhook_id,
                    });
                } else {
                    result.webhooks.unchanged.push({
                        webhook_name: specItem,
                        url: specWebhook.url,
                        webhook_id: sendblocksWebhook.webhook_id,
                    });
                }
            }
        }
    }
    for (const webhook_name in sendblocksWebhooks) {
        const sendblocksWebhook = sendblocksWebhooks[webhook_name];
        if (!Object.keys(spec.webhooks).includes(webhook_name)) {
            result.webhooks.unreferenced.push({
                webhook_name: sendblocksWebhook.webhook_name,
                url: sendblocksWebhook.url,
                secret: sendblocksWebhook.secret,
                webhook_id: sendblocksWebhook.webhook_id,
            });
        }
    }

    // functions
    let sendblocksFunctions: {
        [name: string]: any;
    };
    try {
        sendblocksFunctions = await functions.getFunctionDictionary();
    } catch (error) {
        throw new Error(`Error occurred while fetching functions: ${error}`);
    }
    for (const specItem in spec.functions) {
        const specFunction = spec.functions[specItem];
        // fetch the webhook id for the function, or at least verify that there's a webhook with the same name
        if (!specFunction.webhook) {
            throw new Error(`Function ${specItem} is missing a webhook`);
        }
        const webhook = findWebhookByName(specFunction.webhook, result.webhooks);
        if (!webhook) {
            throw new Error(`Function ${specItem} references a webhook that does not exist: ${specFunction.webhook}`);
        }
        specFunction.webhook_id = webhook.webhook_id;

        // the function spec must include either code or source fields
        if ((!specFunction.code && !specFunction.source) || (specFunction.code && specFunction.source)) {
            throw new Error(`Function ${specItem} must either include "code" or "source" fields`);
        }

        if (specFunction.code) {
            // replace the spec's function code file reference with the code itself
            specFunction.code = convertStringToBase64(fs.readFileSync(path.resolve(specFunction.code)).toString());
        }

        if (specFunction.source) {
            // zip the source directory and encode it as base64
            specFunction.code = await blobToBase64(await zipFolder(specFunction.source));
        }

        const sendblocksFunction = sendblocksFunctions[specItem];
        if (!sendblocksFunction) {
            for (const trigger of specFunction.triggers) {
                try {
                    functionTriggers.validateFunctionTrigger(trigger);
                } catch (error: any) {
                    throw new Error(`Function ${specItem} has an invalid trigger: ${error.message}`);
                }
            }
            result.functions.added.push({
                function_name: specItem,
                ...specFunction,
                trigger_types: specFunction.triggers.map((trigger: any) => trigger.type).join(", "),
                should_send_std_streams: should_send_std_streams(specFunction.should_send_std_streams),
            });
        } else {
            // get the existing function code from sendblocks
            sendblocksFunction.code = await functions.getFunctionCode(sendblocksFunction.function_id);
            if (await functions.isFunctionChanged(specItem, sendblocksFunction, specFunction)) {
                const areTriggersChanged = functionTriggers.areFunctionTriggersChanged(
                    sendblocksFunction.triggers,
                    specFunction.triggers,
                );
                if (areTriggersChanged) {
                    // validate triggers
                    for (const trigger of specFunction.triggers) {
                        try {
                            functionTriggers.validateFunctionTrigger(trigger);
                        } catch (error: any) {
                            throw new Error(`Function ${specItem} has an invalid trigger: ${error.message}`);
                        }
                    }
                }

                result.functions.changed.push({
                    function_name: specItem,
                    ...specFunction,
                    function_id: sendblocksFunction.function_id,
                    changes: [
                        (await functions.isFunctionCodeChanged(sendblocksFunction.code, specFunction.code))
                            ? "code"
                            : "",
                        areTriggersChanged ? "triggers" : "",
                        sendblocksFunction.webhook_id !== specFunction.webhook_id ? "webhook" : "",
                        sendblocksFunction.should_send_std_streams !==
                        should_send_std_streams(specFunction.should_send_std_streams)
                            ? "should_send_std_streams"
                            : "",
                    ]
                        .filter((change) => {
                            return change.length > 0;
                        })
                        .join(", "),
                    should_send_std_streams: should_send_std_streams(specFunction.should_send_std_streams),
                });
            } else {
                result.functions.unchanged.push({
                    function_name: specItem,
                    ...specFunction,
                    trigger_types: specFunction.triggers.map((trigger: any) => trigger.type).join(", "),
                    should_send_std_streams: should_send_std_streams(specFunction.should_send_std_streams),
                    function_id: sendblocksFunction.function_id,
                });
            }
        }
    }
    for (const function_name in sendblocksFunctions) {
        const sendblocksFunction = sendblocksFunctions[function_name];
        const webhook = findWebhookById(sendblocksFunction.webhook_id, result.webhooks);
        if (!webhook) {
            throw new Error(
                `Function ${function_name} references a webhook that does not exist: ${sendblocksFunction.webhook_id}`,
            );
        }
        sendblocksFunction.webhook = webhook.webhook_name;
        if (!Object.keys(spec.functions).includes(function_name)) {
            result.functions.unreferenced.push({
                function_name: sendblocksFunction.function_name,
                function_id: sendblocksFunction.function_id,
                ...sendblocksFunction,
                trigger_types: sendblocksFunction.triggers.map((trigger: any) => trigger.type).join(", "),
                should_send_std_streams: should_send_std_streams(sendblocksFunction.should_send_std_streams),
            });
        }
    }

    return result;
}
