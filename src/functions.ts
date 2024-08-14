import { ApiResponse } from "openapi-typescript-fetch";
import { generateFetcher } from "./fetcher";
import { areFunctionTriggersChanged } from "./function-triggers";

export function convertFunctionToBase64(functionCode: string) {
    return Buffer.from(functionCode).toString("base64");
}

export function convertBase64ToFunction(base64Code: string) {
    return Buffer.from(base64Code, "base64").toString("utf-8");
}

async function generateFunctionsApi() {
    const fetcher = await generateFetcher();

    const api = {
        createFunction: fetcher.path("/api/v1/functions").method("post").create(),
        listFunctions: fetcher.path("/api/v1/functions").method("get").create(),
        getFunctionCode: fetcher.path("/api/v1/functions/{id}/code").method("get").create(),
        patchFunction: fetcher.path("/api/v1/functions/{id}").method("patch").create(),
        deleteFunction: fetcher.path("/api/v1/functions/{id}").method("delete").create(),
    };

    return api;
}

export function isFunctionChanged(name: string, sendblocksFunction: any, specFunction: any) {
    return (
        sendblocksFunction.chain_id !== specFunction.chain_id ||
        sendblocksFunction.code !== specFunction.code ||
        sendblocksFunction.is_enabled !== specFunction.is_enabled ||
        sendblocksFunction.should_send_std_streams !== specFunction.should_send_std_streams ||
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
                    function_code: convertFunctionToBase64(addedFunction.code),
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
                    function_code: convertFunctionToBase64(updatedFunction.code),
                    should_send_std_streams: updatedFunction.should_send_std_streams,
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
