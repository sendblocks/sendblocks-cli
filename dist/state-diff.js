"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStateChanges = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const functionTriggers = __importStar(require("./function-triggers"));
const functions = __importStar(require("./functions"));
const webhooks = __importStar(require("./webhooks"));
function findWebhookById(webhookId, webhooks) {
    return [
        ...webhooks.added,
        ...webhooks.changed,
        ...webhooks.unchanged,
        ...webhooks.unreferenced
    ].find((webhook) => webhook.webhook_id === webhookId);
}
function findWebhookByName(webhookName, webhooks) {
    return [
        ...webhooks.added,
        ...webhooks.changed,
        ...webhooks.unchanged,
        ...webhooks.unreferenced
    ].find((webhook) => webhook.webhook_name === webhookName);
}
function newResourceStateChanges() {
    return {
        added: [],
        changed: [],
        unchanged: [],
        unreferenced: [],
    };
}
function should_send_std_streams(should_send_std_streams) {
    return should_send_std_streams === false ? false : true;
}
function generateStateChanges(spec) {
    return __awaiter(this, void 0, void 0, function* () {
        // compare the state of the functions and webhooks in the yaml files with the
        // state of the functions and webhooks in the SendBlocks, then print the differences
        console.log('Comparing state...');
        const result = {
            webhooks: newResourceStateChanges(),
            functions: newResourceStateChanges(),
        };
        // webhooks
        let sendblocksWebhooks;
        try {
            sendblocksWebhooks = yield webhooks.getWebhookDictionary();
        }
        catch (error) {
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
            }
            else {
                // if the webhook is in the sendblocksWebhooks, check if the webhook has changed
                if (Object.keys(sendblocksWebhooks).includes(specItem)) {
                    if (webhooks.isWebhookChanged(specItem, sendblocksWebhook, specWebhook)) {
                        result.webhooks.changed.push({
                            webhook_name: specItem,
                            url: specWebhook.url,
                            changes: [
                                sendblocksWebhook.url !== specWebhook.url ? `url (currently ${sendblocksWebhook.url})` : "",
                                sendblocksWebhook.secret !== specWebhook.secret ? "secret" : "",
                            ].filter((change) => { return change.length > 0; }).join(', '),
                            secretChanged: specWebhook.secret !== sendblocksWebhook.secret,
                            secret: specWebhook.secret,
                            webhook_id: sendblocksWebhook.webhook_id,
                        });
                    }
                    else {
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
        let sendblocksFunctions;
        try {
            sendblocksFunctions = yield functions.getFunctionDictionary();
        }
        catch (error) {
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
            specFunction.code = fs_1.default.readFileSync(path_1.default.resolve(specFunction.code)).toString();
            const sendblocksFunction = sendblocksFunctions[specItem];
            if (!sendblocksFunction) {
                if (!specFunction.triggers || specFunction.triggers.length === 0) {
                    throw new Error(`Function ${specItem} has no triggers defined`);
                }
                for (const trigger of specFunction.triggers) {
                    try {
                        functionTriggers.validateFunctionTrigger(trigger);
                    }
                    catch (error) {
                        throw new Error(`Function ${specItem} has an invalid trigger: ${error.message}`);
                    }
                }
                result.functions.added.push(Object.assign(Object.assign({ function_name: specItem }, specFunction), { trigger_types: specFunction.triggers.map((trigger) => trigger.type).join(', '), should_send_std_streams: should_send_std_streams(specFunction.should_send_std_streams) }));
            }
            else {
                // get the existing function code from sendblocks
                sendblocksFunction.code = yield functions.getFunctionCode(sendblocksFunction.function_id);
                if (functions.isFunctionChanged(specItem, sendblocksFunction, specFunction)) {
                    result.functions.changed.push(Object.assign(Object.assign({ function_name: specItem }, specFunction), { function_id: sendblocksFunction.function_id, changes: [
                            sendblocksFunction.code !== specFunction.code ? "code" : "",
                            functionTriggers.areFunctionTriggersChanged(sendblocksFunction.triggers, specFunction.triggers) ? "triggers" : "",
                            sendblocksFunction.webhook_id !== specFunction.webhook_id ? "webhook" : "",
                            sendblocksFunction.should_send_std_streams !== should_send_std_streams(specFunction.should_send_std_streams) ? "should_send_std_streams" : "",
                        ].filter((change) => { return change.length > 0; }).join(', '), should_send_std_streams: should_send_std_streams(specFunction.should_send_std_streams) }));
                }
                else {
                    result.functions.unchanged.push(Object.assign(Object.assign({ function_name: specItem }, specFunction), { trigger_types: specFunction.triggers.map((trigger) => trigger.type).join(', '), should_send_std_streams: should_send_std_streams(specFunction.should_send_std_streams), function_id: sendblocksFunction.function_id }));
                }
            }
        }
        for (const function_name in sendblocksFunctions) {
            const sendblocksFunction = sendblocksFunctions[function_name];
            const webhook = findWebhookById(sendblocksFunction.webhook_id, result.webhooks);
            if (!webhook) {
                throw new Error(`Function ${function_name} references a webhook that does not exist: ${sendblocksFunction.webhook_id}`);
            }
            sendblocksFunction.webhook = webhook.webhook_name;
            if (!Object.keys(spec.functions).includes(function_name)) {
                result.functions.unreferenced.push(Object.assign(Object.assign({ function_name: sendblocksFunction.function_name, function_id: sendblocksFunction.function_id }, sendblocksFunction), { trigger_types: sendblocksFunction.triggers.map((trigger) => trigger.type).join(', '), should_send_std_streams: should_send_std_streams(sendblocksFunction.should_send_std_streams) }));
            }
        }
        return result;
    });
}
exports.generateStateChanges = generateStateChanges;
//# sourceMappingURL=state-diff.js.map