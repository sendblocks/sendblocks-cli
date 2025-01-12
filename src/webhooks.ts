import { Command } from "commander";
import { ApiResponse } from "openapi-typescript-fetch";
import { generateFetcher } from "./fetcher";
import { parseError } from "./utils";

async function generateWebhooksApi() {
    const fetcher = await generateFetcher();

    const api = {
        createWebhook: fetcher.path("/api/v1/webhooks").method("post").create(),
        listWebhooks: fetcher.path("/api/v1/webhooks").method("get").create(),
        deleteWebhook: fetcher.path("/api/v1/webhooks/{id}").method("delete").create(),
    };

    return api;
}

export function isWebhookChanged(name: string, sendblocksWebhook: any, specWebhook: any) {
    return sendblocksWebhook.url !== specWebhook.url || sendblocksWebhook.secret !== specWebhook.secret;
}

export async function listWebhooks() {
    const api = await generateWebhooksApi();
    const webhooks = [];
    let page = 1;
    let response: ApiResponse;
    do {
        response = await api.listWebhooks({ page: page++ });
        webhooks.push(...response.data.items);
    } while (response.data.page < response.data.pages);
    return webhooks;
}

export async function getWebhookDictionary() {
    const returnObject: { [name: string]: any } = {};
    const webhooksList = await listWebhooks();
    if (webhooksList) {
        for (const webhook of webhooksList) {
            returnObject[webhook.webhook_name] = webhook;
        }
    }
    return returnObject;
}

export async function deleteWebhook(webhookName: string) {
    const api = await generateWebhooksApi();
    const webhooks = await getWebhookDictionary();
    const sendblocksWebhook = webhooks[webhookName];
    if (!sendblocksWebhook) {
        throw new Error(`Webhook ${webhookName} not found`);
    }
    const webhookId = sendblocksWebhook.webhook_id;
    try {
        const response = await api.deleteWebhook({ id: webhookId });
        return response;
    } catch (error) {
        throw new Error(`Error occurred while deleting webhook ${webhookName} (${webhookId}): ${error}`);
    }
}

export async function deploy(stateChanges: ResourceStateChanges) {
    const api = await generateWebhooksApi();
    const results = [];
    for (const addedWebhook of stateChanges.added) {
        console.log(`Creating webhook ${addedWebhook.webhook_name}...`);
        try {
            const response = await api.createWebhook({
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
            } else {
                throw new Error(`${response.status} ${response.statusText}`);
            }
        } catch (error) {
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
}

export async function destroy(stateChanges: ResourceStateChanges, functionDeploymentResults: any) {
    const api = await generateWebhooksApi();
    const results = [];

    const webhooksToDelete = [...stateChanges.changed, ...stateChanges.unchanged];

    for (const webhookToDelete of webhooksToDelete) {
        console.log(`Deleting webhook ${webhookToDelete.webhook_name}...`);
        try {
            const response = await api.deleteWebhook({ id: webhookToDelete.webhook_id });
            if (response.ok) {
                results.push({
                    webhook_name: webhookToDelete.webhook_name,
                    destroyed: true,
                });
            } else {
                throw new Error(`${response.status} ${response.statusText}`);
            }
        } catch (error) {
            results.push({
                destroyed: false,
                webhook_name: webhookToDelete.webhook_name,
                response: `${error}`,
            });
        }
    }

    return results;
}

export function addCommands(program: Command) {
    const webhooksCommand = program.command("webhooks");
    webhooksCommand
        .command("list")
        .description("List all webhooks.")
        .action(async () => {
            try {
                console.log("Listing webhooks...");
                console.log(await listWebhooks());
            } catch (error: any) {
                console.error(parseError(error));
                process.exit(1);
            }
        });
    webhooksCommand
        .command("delete")
        .description("Delete a webhook.")
        .argument("<name>", "Name of the webhook")
        .action(async (name) => {
            try {
                console.log("Deleting webhook...");
                console.log(await deleteWebhook(name));
            } catch (error: any) {
                console.error(parseError(error));
                process.exit(1);
            }
        });
}
