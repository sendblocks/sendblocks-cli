"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.destroy = exports.deploy = exports.deleteFunction = exports.getFunctionCode = exports.getFunctionDictionary = exports.listFunctions = exports.isFunctionChanged = exports.convertBase64ToFunction = exports.convertFunctionToBase64 = void 0;
const fetcher_1 = require("./fetcher");
const function_triggers_1 = require("./function-triggers");
function convertFunctionToBase64(functionCode) {
    return Buffer.from(functionCode).toString("base64");
}
exports.convertFunctionToBase64 = convertFunctionToBase64;
function convertBase64ToFunction(base64Code) {
    return Buffer.from(base64Code, "base64").toString("utf-8");
}
exports.convertBase64ToFunction = convertBase64ToFunction;
function generateFunctionsApi() {
    return __awaiter(this, void 0, void 0, function* () {
        const fetcher = yield (0, fetcher_1.generateFetcher)();
        const api = {
            createFunction: fetcher.path("/api/v1/functions").method("post").create(),
            listFunctions: fetcher.path("/api/v1/functions").method("get").create(),
            getFunctionCode: fetcher.path("/api/v1/functions/{id}/code").method("get").create(),
            patchFunction: fetcher.path("/api/v1/functions/{id}").method("patch").create(),
            deleteFunction: fetcher.path("/api/v1/functions/{id}").method("delete").create(),
        };
        return api;
    });
}
function isFunctionChanged(name, sendblocksFunction, specFunction) {
    return (sendblocksFunction.chain_id !== specFunction.chain_id ||
        sendblocksFunction.code !== specFunction.code ||
        sendblocksFunction.is_enabled !== specFunction.is_enabled ||
        sendblocksFunction.should_send_std_streams !== specFunction.should_send_std_streams ||
        (0, function_triggers_1.areFunctionTriggersChanged)(sendblocksFunction.triggers, specFunction.triggers) ||
        sendblocksFunction.webhook_id !== specFunction.webhook_id);
}
exports.isFunctionChanged = isFunctionChanged;
function listFunctions() {
    return __awaiter(this, void 0, void 0, function* () {
        const api = yield generateFunctionsApi();
        const functions = [];
        let page = 1;
        let response;
        do {
            response = yield api.listFunctions({ page: page++ });
            functions.push(...response.data.items);
        } while (response.data.page < response.data.pages);
        return functions;
    });
}
exports.listFunctions = listFunctions;
function getFunctionDictionary() {
    return __awaiter(this, void 0, void 0, function* () {
        const returnObject = {};
        const functionsList = yield listFunctions();
        if (functionsList) {
            for (const func of functionsList) {
                returnObject[func.function_name] = func;
            }
        }
        return returnObject;
    });
}
exports.getFunctionDictionary = getFunctionDictionary;
function getFunctionCode(functionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const api = yield generateFunctionsApi();
        try {
            const response = yield api.getFunctionCode({ id: functionId });
            return response.data;
        }
        catch (error) {
            throw new Error(`Error occurred while getting code for function ${functionId}: ${error}`);
        }
    });
}
exports.getFunctionCode = getFunctionCode;
function deleteFunction(functionName) {
    return __awaiter(this, void 0, void 0, function* () {
        const api = yield generateFunctionsApi();
        const functions = yield getFunctionDictionary();
        const sendblocksFunction = functions[functionName];
        if (!sendblocksFunction) {
            throw new Error(`Function ${functionName} not found`);
        }
        const functionId = sendblocksFunction.function_id;
        try {
            const response = yield api.deleteFunction({ id: functionId });
            return response;
        }
        catch (error) {
            throw new Error(`Error occurred while deleting function ${functionName} (${functionId}): ${error}`);
        }
    });
}
exports.deleteFunction = deleteFunction;
function findWebhookIdInDeploymentResults(webhookName, webhookDeploymentResults) {
    var _a;
    return (_a = webhookDeploymentResults.find((webhook) => webhook.webhook_name === webhookName)) === null || _a === void 0 ? void 0 : _a.webhook_id;
}
function deploy(stateChanges, webhookDeploymentResults) {
    return __awaiter(this, void 0, void 0, function* () {
        const api = yield generateFunctionsApi();
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
            }
            else {
                console.log(`Creating function ${addedFunction.function_name}...`);
                try {
                    const response = yield api.createFunction({
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
                    }
                    else {
                        throw new Error(`${response.status} ${response.data}`);
                    }
                }
                catch (error) {
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
            }
            else {
                console.log(`Updating function ${updatedFunction.function_name}...`);
                try {
                    const response = yield api.patchFunction({
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
                    }
                    else {
                        throw new Error(`${response.status} ${response}`);
                    }
                }
                catch (error) {
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
    });
}
exports.deploy = deploy;
function destroy(stateChanges) {
    return __awaiter(this, void 0, void 0, function* () {
        const api = yield generateFunctionsApi();
        const results = [];
        const functionsToDelete = [...stateChanges.changed, ...stateChanges.unchanged];
        for (const functionToDelete of functionsToDelete) {
            console.log(`Deleting function ${functionToDelete.function_name}...`);
            try {
                const response = yield api.deleteFunction({ id: functionToDelete.function_id });
                if (response.ok) {
                    results.push({
                        function_name: functionToDelete.function_name,
                        destroyed: true,
                    });
                }
                else {
                    throw new Error(`${response.status} ${response.data}`);
                }
            }
            catch (error) {
                results.push({
                    destroyed: false,
                    function_name: functionToDelete.function_name,
                    response: `${error}`,
                });
                throw new Error(`Error occurred while deleting function ${functionToDelete.function_name}: ${error}`);
            }
        }
        return results;
    });
}
exports.destroy = destroy;
//# sourceMappingURL=functions.js.map