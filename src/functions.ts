import { ApiResponse } from "openapi-typescript-fetch";
import { colorize, color } from "json-colorizer";
import { forceHexOrDecimalToDecimal } from "./convert";
import { generateFetcher } from "./fetcher";
import { areFunctionTriggersChanged } from "./function-triggers";
import { listYamlFiles, mergeYamlFiles } from "./sb-yaml";
import { components } from "./types/api";
import { areBase64ZipFilesEquivalent, isPlainText } from "./zip-tools";

async function generateFunctionsApi() {
    const fetcher = await generateFetcher();

    const api = {
        createFunction: fetcher.path("/api/v1/functions").method("post").create(),
        listFunctions: fetcher.path("/api/v1/functions").method("get").create(),
        getFunctionCode: fetcher.path("/api/v1/functions/{id}/code").method("get").create(),
        patchFunction: fetcher.path("/api/v1/functions/{id}").method("patch").create(),
        deleteFunction: fetcher.path("/api/v1/functions/{id}").method("delete").create(),
        replayBlocks: fetcher.path("/api/v1/functions/replay_blocks").method("post").create(),
    };

    return api;
}

export async function deleteFunction(functionName: string) {
    const api = await generateFunctionsApi();
    const functions = await getFunctionDictionary();
    const sendblocksFunction = functions[functionName];
    if (!sendblocksFunction) {
        throw new Error(`Function ${functionName} not found`);
    }
    const functionId = sendblocksFunction.function_id;
    try {
        const response = await api.deleteFunction({ id: functionId });
        return response;
    } catch (error) {
        throw new Error(`Error occurred while deleting function ${functionName} (${functionId}): ${error}`);
    }
}

function findWebhookIdInDeploymentResults(webhookName: string, webhookDeploymentResults: any) {
    return webhookDeploymentResults.find((webhook: any) => webhook.webhook_name === webhookName)?.webhook_id;
}

export async function getFunctionDictionary() {
    const returnObject: { [name: string]: any } = {};
    const functionsList = await listFunctions();
    if (functionsList) {
        for (const func of functionsList) {
            returnObject[func.function_name] = func;
        }
    }
    return returnObject;
}

export async function getFunctionCode(functionId: string) {
    const api = await generateFunctionsApi();
    try {
        const response = await api.getFunctionCode({ id: functionId });
        return response.data;
    } catch (error) {
        throw new Error(`Error occurred while getting code for function ${functionId}: ${error}`);
    }
}

export async function isFunctionCodeChanged(a: any, b: any) {
    // if the code isn't identical, identify whether the code is text or zip
    if (a !== b) {
        // if either of the code entries are text, then code has changed
        if (isPlainText(a) || isPlainText(b)) {
            return true;
        }
        // both are zip files, compare them
        const areZipFilesEquivalent = await areBase64ZipFilesEquivalent(a, b);
        if (!areZipFilesEquivalent) {
            return true;
        }
    }
    return false;
}

export async function isFunctionChanged(name: string, sendblocksFunction: any, specFunction: any) {
    return (
        sendblocksFunction.chain_id !== specFunction.chain_id ||
        sendblocksFunction.is_enabled !== specFunction.is_enabled ||
        sendblocksFunction.should_send_std_streams !== specFunction.should_send_std_streams ||
        (await isFunctionCodeChanged(sendblocksFunction.code, specFunction.code)) ||
        areFunctionTriggersChanged(sendblocksFunction.triggers, specFunction.triggers) ||
        sendblocksFunction.webhook_id !== specFunction.webhook_id
    );
}

export async function listFunctions() {
    const api = await generateFunctionsApi();
    const functions = [];
    let page = 1;
    let response: ApiResponse;
    do {
        response = await api.listFunctions({ page: page++ });
        functions.push(...response.data.items);
    } while (response.data.page < response.data.pages);
    return functions;
}

export async function replayBlocks(functionNames: string[], startBlock: string, endBlock: string) {
    const specFunctionNames = Object.keys((await mergeYamlFiles(listYamlFiles({ quiet: true }))).functions);
    if (functionNames.length === 0) {
        functionNames = specFunctionNames;
    } else {
        for (const name of functionNames) {
            if (!specFunctionNames.includes(name)) {
                console.error(`Function ${name} not found in spec`);
                process.exit(1);
            }
        }
    }
    const api = await generateFunctionsApi();
    const deployedFunctions = await getFunctionDictionary();

    // we replay the functions in batches per chain
    type ReplayCommand = {
        [chainId: string]: components["schemas"]["ReplayBlocksParams"];
    };
    const replayCommands: ReplayCommand = {};

    functionNames.forEach((name) => {
        const sendblocksFunction = deployedFunctions[name];
        if (!sendblocksFunction) {
            console.warn(`Function ${name} not deployed, skipping...`);
        } else {
            const chainId = sendblocksFunction.chain_id;
            if (replayCommands[chainId]) {
                replayCommands[chainId].functions.push(sendblocksFunction.function_id);
            } else {
                replayCommands[chainId] = {
                    chain_id: chainId,
                    start_block_number: forceHexOrDecimalToDecimal(startBlock),
                    end_block_number: forceHexOrDecimalToDecimal(endBlock),
                    functions: [sendblocksFunction.function_id],
                };
            }
        }
    });

    for (const replayCommand of Object.values(replayCommands)) {
        try {
            const response = await api.replayBlocks({
                functions: replayCommand.functions,
                chain_id: replayCommand.chain_id,
                start_block_number: replayCommand.start_block_number,
                end_block_number: replayCommand.end_block_number,
            });
            if (!response.ok) {
                throw new Error(`${response.status} ${response.data}`);
            }
        } catch (error) {
            throw new Error(`Error occurred while replaying blocks on chain ${replayCommand.chain_id}: ${error}`);
        }
    }
}

export async function deploy(stateChanges: ResourceStateChanges, webhookDeploymentResults: any) {
    const api = await generateFunctionsApi();
    const results = [];

    for (const addedFunction of stateChanges.added) {
        // look up function's webhook id, if it's not available, skip this function
        const webhookName = addedFunction.webhook;
        const webhookId = findWebhookIdInDeploymentResults(webhookName, webhookDeploymentResults);
        if (!webhookId) {
            console.log(`Skipping function ${addedFunction.function_name}...`);
            results.push({
                skipped: true,
                function_name: addedFunction.function_name,
                response: `Webhook ${webhookName} not found`,
            });
        } else {
            console.log(`Creating function ${addedFunction.function_name}...`);
            try {
                const response = await api.createFunction({
                    function_name: addedFunction.function_name,
                    chain_id: addedFunction.chain_id,
                    triggers: addedFunction.triggers,
                    webhook_id: webhookId,
                    function_code: addedFunction.code,
                    should_send_std_streams: addedFunction.should_send_std_streams,
                });
                if (response.ok) {
                    results.push({
                        function_name: addedFunction.function_name,
                        function_id: response.data.function_id,
                        deployed: true,
                    });
                } else {
                    throw new Error(`${response.status} ${response.data}`);
                }
            } catch (error) {
                results.push({
                    deployed: false,
                    function_name: addedFunction.function_name,
                    response: `${error}`,
                });
                throw new Error(`Error occurred while creating function ${addedFunction.name}: ${error}`);
            }
        }
    }

    for (const updatedFunction of stateChanges.changed) {
        // look up function's webhook id, if it's not available, skip this function
        const webhookName = updatedFunction.webhook;
        const webhookId = findWebhookIdInDeploymentResults(webhookName, webhookDeploymentResults);
        if (!webhookId) {
            console.log(`Skipping function ${updatedFunction.function_name}...`);
            results.push({
                skipped: true,
                function_name: updatedFunction.function_name,
                response: `Webhook ${webhookName} not found`,
            });
        } else {
            console.log(`Updating function ${updatedFunction.function_name}...`);
            try {
                const response = await api.patchFunction({
                    id: updatedFunction.function_id,
                    function_name: updatedFunction.function_name,
                    is_enabled: updatedFunction.is_enabled,
                    triggers: updatedFunction.triggers,
                    webhook_id: webhookId,
                    function_code: updatedFunction.code,
                    should_send_std_streams: updatedFunction.should_send_std_streams,
                    description: updatedFunction.description,
                });
                if (response.ok) {
                    results.push({
                        function_name: updatedFunction.function_name,
                        deployed: true,
                    });
                } else {
                    throw new Error(`${response.status} ${response}`);
                }
            } catch (error) {
                results.push({
                    deployed: false,
                    function_name: updatedFunction.function_name,
                    response: `${error}`,
                });
                throw new Error(`Error occurred while updating function ${updatedFunction.name}: ${error}`);
            }
        }
    }

    for (const unchangedFunction of [...stateChanges.unchanged, ...stateChanges.unreferenced]) {
        results.push({
            skipped: true,
            function_name: unchangedFunction.function_name,
            function_id: unchangedFunction.function_id,
        });
    }

    return results;
}

export async function destroy(stateChanges: ResourceStateChanges) {
    const api = await generateFunctionsApi();
    const results = [];

    const functionsToDelete = [...stateChanges.changed, ...stateChanges.unchanged];

    for (const functionToDelete of functionsToDelete) {
        console.log(`Deleting function ${functionToDelete.function_name}...`);
        try {
            const response = await api.deleteFunction({ id: functionToDelete.function_id });
            if (response.ok) {
                results.push({
                    function_name: functionToDelete.function_name,
                    destroyed: true,
                });
            } else {
                throw new Error(`${response.status} ${response.data}`);
            }
        } catch (error) {
            results.push({
                destroyed: false,
                function_name: functionToDelete.function_name,
                response: `${error}`,
            });
            throw new Error(`Error occurred while deleting function ${functionToDelete.function_name}: ${error}`);
        }
    }

    return results;
}

export function prettyPrint(functions: any[]) {
    console.log(
        colorize(functions, {
            indent: 2,
            colors: {
                StringKey: color.white,
                BooleanLiteral: color.yellow,
                NullLiteral: color.red,
                StringLiteral: color.green,
                NumberLiteral: color.blue,
                Whitespace: color.gray,
                Brace: color.white,
                Bracket: color.white,
                Colon: color.white,
                Comma: color.white,
            },
        }),
    );
}
