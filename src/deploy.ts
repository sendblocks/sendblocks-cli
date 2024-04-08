import fs from 'fs';
import path from 'path';
import prompts from 'prompts';

import * as functionTriggers from './function-triggers';
import * as functions from './functions';
import { Spec, listYamlFiles, mergeYamlFiles } from './sb-yaml';
import * as webhooks from './webhooks';

type StateComparisonResult = {
    webhooks: ResourceStateChanges,
    functions: ResourceStateChanges,
};


export async function deploy({previewOnly}: { previewOnly?: boolean} = {}) {
    // merge the yaml files into a single spec
    const spec = await mergeYamlFiles(listYamlFiles());

    // compare the state of the functions and webhooks in
    // the yaml files with the state of the functions and
    // webhooks in the SendBlocks
    const stateChanges = await generateStateChanges(spec);

    printStateChanges(stateChanges);

    if (previewOnly) {
        return;
    }

    // confirm changes with the user
    const confirm = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Please confirm that you have reviewed the changes and want to proceed with the deployment',
    });

    if (confirm.value) {
        // deploy the changes
        console.log('Deploying changes...\n');

        const webhookResults = await webhooks.deploy(stateChanges.webhooks);
        const functionResults = await functions.deploy(stateChanges.functions, webhookResults);

        console.log('\nDeployment complete!');

        console.log('\nWebhook deployment results:')
        console.table(webhookResults, ['webhook_name', 'webhook_id', 'skipped', 'succeeded', 'response']);
        console.log('Function deployment results:')
        console.table(functionResults, ['function_name', 'webhook_id', 'skipped', 'succeeded', 'response']);
    }
}

function findWebhookByName(webhookName: string, webhooks: ResourceStateChanges) {
    return [
        ...webhooks.added,
        ...webhooks.changed,
        ...webhooks.unchanged,
        ...webhooks.unreferenced
    ].find((webhook: any) => webhook.webhook_name === webhookName);
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
    return should_send_std_streams === false ? false : true
}

async function generateStateChanges(spec: Spec) {
    // compare the state of the functions and webhooks in the yaml files with the
    // state of the functions and webhooks in the SendBlocks, then print the differences
    console.log('Comparing state...');

    const result: StateComparisonResult = {
        webhooks: newResourceStateChanges(),
        functions: newResourceStateChanges(),
    };

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
                        ].filter((change) => { return change.length > 0;}).join(', '),
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

        // replace the spec's function code file reference with the code itself
        specFunction.code = fs.readFileSync(path.resolve(specFunction.code)).toString();

        const sendblocksFunction = sendblocksFunctions[specItem];
        if (!sendblocksFunction) {
            if (!specFunction.triggers || specFunction.triggers.length === 0) {
                throw new Error(`Function ${specItem} has no triggers defined`);
            }
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
                trigger_types: specFunction.triggers.map((trigger: any) => trigger.type).join(', '),
                should_send_std_streams: should_send_std_streams(specFunction.should_send_std_streams),
            });
        } else {
            // get the existing function code from sendblocks
            sendblocksFunction.code = await functions.getFunctionCode(sendblocksFunction.function_id);
            if (functions.isFunctionChanged(specItem, sendblocksFunction, specFunction)) {
                result.functions.changed.push({
                    function_name: specItem,
                    ...specFunction,
                    function_id: sendblocksFunction.function_id,
                    changes: [
                        sendblocksFunction.code !== specFunction.code ? "code" : "",
                        functionTriggers.areFunctionTriggersChanged(sendblocksFunction.triggers, specFunction.triggers) ? "triggers" : "",
                        sendblocksFunction.webhook_id !== specFunction.webhook_id ? "webhook" : "",
                        sendblocksFunction.should_send_std_streams !== should_send_std_streams(specFunction.should_send_std_streams) ? "should_send_std_streams" : "",
                    ].filter((change) => { return change.length > 0;}).join(', '),
                    should_send_std_streams: should_send_std_streams(specFunction.should_send_std_streams),
                });
            } else {
                result.functions.unchanged.push({
                    function_name: specItem,
                    ...specFunction,
                    trigger_types: specFunction.triggers.map((trigger: any) => trigger.type).join(', '),
                    should_send_std_streams: should_send_std_streams(specFunction.should_send_std_streams),
                });
            }
        }
    }
    for (const function_name in sendblocksFunctions) {
        const sendblocksFunction = sendblocksFunctions[function_name];
        if (!Object.keys(spec.functions).includes(function_name)) {
            result.functions.unreferenced.push({
                function_name: sendblocksFunction.function_name,
                function_id: sendblocksFunction.function_id,
                ...sendblocksFunction,
                trigger_types: sendblocksFunction.triggers.map((trigger: any) => trigger.type).join(', '),
                should_send_std_streams: should_send_std_streams(sendblocksFunction.should_send_std_streams),
            });
        }
    }

    return result;
}

function printStateChanges(stateChanges: StateComparisonResult) {
    // print a table showing the differences between the states
    console.log('Webhooks:');
    if (stateChanges.webhooks.added.length > 0) {
        console.log(' - To be created:');
        console.table(stateChanges.webhooks.added, ['webhook_name', 'url']);
    }
    if (stateChanges.webhooks.changed.length > 0) {
        console.log(' - Changed:');
        console.table(stateChanges.webhooks.changed, ['webhook_name', 'url', 'webhook_id', 'changes']);
    }
    if (stateChanges.webhooks.unchanged.length > 0) {
        console.log(' - Unchanged:');
        console.table(stateChanges.webhooks.unchanged, ['webhook_name', 'url', 'webhook_id']);
    }
    if (stateChanges.webhooks.unreferenced.length > 0) {
        console.log(' - Unreferenced:');
        console.table(stateChanges.webhooks.unreferenced, ['webhook_name', 'url', 'webhook_id']);
    }
    console.log('Functions:');
    if (stateChanges.functions.added.length > 0) {
        console.log(' - To be created:');
        console.table(stateChanges.functions.added, ['function_name', 'chain_id', 'trigger_types', 'webhook', 'should_send_std_streams']);
    }
    if (stateChanges.functions.changed.length > 0) {
        console.log(' - Changed:');
        console.table(stateChanges.functions.changed, ['function_name', 'chain_id', 'webhook', 'should_send_std_streams', 'changes']);
    }
    if (stateChanges.functions.unchanged.length > 0) {
        console.log(' - Unchanged:');
        console.table(stateChanges.functions.unchanged, ['function_name', 'chain_id', 'trigger_types', 'webhook', 'should_send_std_streams']);
    }
    if (stateChanges.functions.unreferenced.length > 0) {
        console.log(' - Unreferenced:');
        console.table(stateChanges.functions.unreferenced, ['function_name', 'chain_id', 'trigger_types', 'webhook', 'should_send_std_streams']);
    }
}
