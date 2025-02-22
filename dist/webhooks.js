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
exports.addCommands = exports.destroy = exports.deploy = exports.deleteWebhook = exports.getWebhookDictionary = exports.listWebhooks = exports.isWebhookChanged = void 0;
const fetcher_1 = require("./fetcher");
const utils_1 = require("./utils");
function generateWebhooksApi() {
    return __awaiter(this, void 0, void 0, function* () {
        const fetcher = yield (0, fetcher_1.generateFetcher)();
        const api = {
            createWebhook: fetcher.path("/api/v1/webhooks").method("post").create(),
            listWebhooks: fetcher.path("/api/v1/webhooks").method("get").create(),
            deleteWebhook: fetcher.path("/api/v1/webhooks/{id}").method("delete").create(),
        };
        return api;
    });
}
function isWebhookChanged(name, sendblocksWebhook, specWebhook) {
    return sendblocksWebhook.url !== specWebhook.url || sendblocksWebhook.secret !== specWebhook.secret;
}
exports.isWebhookChanged = isWebhookChanged;
function listWebhooks() {
    return __awaiter(this, void 0, void 0, function* () {
        const api = yield generateWebhooksApi();
        const webhooks = [];
        let page = 1;
        let response;
        do {
            response = yield api.listWebhooks({ page: page++ });
            webhooks.push(...response.data.items);
        } while (response.data.page < response.data.pages);
        return webhooks;
    });
}
exports.listWebhooks = listWebhooks;
function getWebhookDictionary() {
    return __awaiter(this, void 0, void 0, function* () {
        const returnObject = {};
        const webhooksList = yield listWebhooks();
        if (webhooksList) {
            for (const webhook of webhooksList) {
                returnObject[webhook.webhook_name] = webhook;
            }
        }
        return returnObject;
    });
}
exports.getWebhookDictionary = getWebhookDictionary;
function deleteWebhook(webhookName) {
    return __awaiter(this, void 0, void 0, function* () {
        const api = yield generateWebhooksApi();
        const webhooks = yield getWebhookDictionary();
        const sendblocksWebhook = webhooks[webhookName];
        if (!sendblocksWebhook) {
            throw new Error(`Webhook ${webhookName} not found`);
        }
        const webhookId = sendblocksWebhook.webhook_id;
        try {
            const response = yield api.deleteWebhook({ id: webhookId });
            return response;
        }
        catch (error) {
            throw new Error(`Error occurred while deleting webhook ${webhookName} (${webhookId}): ${error}`);
        }
    });
}
exports.deleteWebhook = deleteWebhook;
function deploy(stateChanges) {
    return __awaiter(this, void 0, void 0, function* () {
        const api = yield generateWebhooksApi();
        const results = [];
        for (const addedWebhook of stateChanges.added) {
            console.log(`Creating webhook ${addedWebhook.webhook_name}...`);
            try {
                const response = yield api.createWebhook({
                    webhook_name: addedWebhook.webhook_name,
                    url: addedWebhook.url,
                    secret: addedWebhook.secret,
                });
                if (response.ok) {
                    results.push({
                        deployed: true,
                        webhook_name: addedWebhook.webhook_name,
                        webhook_id: response.data.webhook_id,
                        url: addedWebhook.url,
                    });
                }
                else {
                    throw new Error(`${response.status} ${response.statusText}`);
                }
            }
            catch (error) {
                results.push({
                    deployed: false,
                    webhook_name: addedWebhook.webhook_name,
                    url: addedWebhook.url,
                    response: `${error}`,
                });
            }
        }
        for (const updatedWebhook of stateChanges.changed) {
            console.log(`Skipping webhook ${updatedWebhook.webhook_name}...`);
            results.push({
                skipped: true,
                webhook_name: updatedWebhook.webhook_name,
                response: `Webhook updates not supported`,
            });
        }
        for (const unchangedWebhook of [...stateChanges.unchanged, ...stateChanges.unreferenced]) {
            results.push({
                skipped: true,
                webhook_name: unchangedWebhook.webhook_name,
                url: unchangedWebhook.url,
                webhook_id: unchangedWebhook.webhook_id,
            });
        }
        return results;
    });
}
exports.deploy = deploy;
function destroy(stateChanges, functionDeploymentResults) {
    return __awaiter(this, void 0, void 0, function* () {
        const api = yield generateWebhooksApi();
        const results = [];
        const webhooksToDelete = [...stateChanges.changed, ...stateChanges.unchanged];
        for (const webhookToDelete of webhooksToDelete) {
            console.log(`Deleting webhook ${webhookToDelete.webhook_name}...`);
            try {
                const response = yield api.deleteWebhook({ id: webhookToDelete.webhook_id });
                if (response.ok) {
                    results.push({
                        webhook_name: webhookToDelete.webhook_name,
                        destroyed: true,
                    });
                }
                else {
                    throw new Error(`${response.status} ${response.statusText}`);
                }
            }
            catch (error) {
                results.push({
                    destroyed: false,
                    webhook_name: webhookToDelete.webhook_name,
                    response: `${error}`,
                });
            }
        }
        return results;
    });
}
exports.destroy = destroy;
function addCommands(program) {
    const webhooksCommand = program.command("webhooks");
    webhooksCommand
        .command("list")
        .description("List all webhooks.")
        .action(() => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Listing webhooks...");
            console.log(yield listWebhooks());
        }
        catch (error) {
            console.error((0, utils_1.parseError)(error));
            process.exit(1);
        }
    }));
    webhooksCommand
        .command("delete")
        .description("Delete a webhook.")
        .argument("<name>", "Name of the webhook")
        .action((name) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Deleting webhook...");
            console.log(yield deleteWebhook(name));
        }
        catch (error) {
            console.error((0, utils_1.parseError)(error));
            process.exit(1);
        }
    }));
}
exports.addCommands = addCommands;
//# sourceMappingURL=webhooks.js.map