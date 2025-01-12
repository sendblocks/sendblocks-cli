import prompts from "prompts";

import { Command } from "commander";
import * as functions from "./functions";
import { listYamlFiles, mergeYamlFiles } from "./sb-yaml";
import { generateStateChanges } from "./state-diff";
import * as subgraphs from "./subgraphs";
import { parseError } from "./utils";
import * as webhooks from "./webhooks";

type StateComparisonResult = {
    subgraphs: ResourceStateChanges;
    webhooks: ResourceStateChanges;
    functions: ResourceStateChanges;
};

export async function deploy({
    dryRun,
    nonInteractive,
    previewOnly,
}: { dryRun?: boolean; nonInteractive?: boolean; previewOnly?: boolean } = {}) {
    // merge the yaml files into a single spec
    const spec = await mergeYamlFiles(listYamlFiles());

    const stateChanges = await generateStateChanges(spec);

    printStateChanges(stateChanges);

    if (previewOnly) {
        return;
    }

    if (dryRun) {
        console.log("Dry-run complete! No changes were deployed.");
        return;
    }

    if (
        stateChanges.subgraphs.added.length === 0 &&
        stateChanges.webhooks.added.length === 0 &&
        stateChanges.functions.added.length === 0 &&
        stateChanges.subgraphs.changed.length === 0 &&
        stateChanges.webhooks.changed.length === 0 &&
        stateChanges.functions.changed.length === 0
    ) {
        console.log("No changes to deploy");
        return;
    }

    let confirm;
    if (!nonInteractive) {
        // confirm changes with the user
        confirm = await prompts({
            type: "confirm",
            name: "value",
            message: "Please confirm that you have reviewed the changes and want to proceed with the deployment",
        });
    }

    if (nonInteractive || confirm?.value) {
        // deploy the changes
        console.log("Deploying changes...\n");

        const subgraphResults = await subgraphs.deploy(stateChanges.subgraphs);
        const webhookResults = await webhooks.deploy(stateChanges.webhooks);
        const functionResults = await functions.deploy(stateChanges.functions, webhookResults);

        console.log("\nDeployment complete!");

        if (subgraphResults.length > 0) {
            console.log("\nSubgraph deployment results:");
            console.table(subgraphResults, ["schema_name", "deployed", "skipped", "response"]);
        }
        if (webhookResults.length > 0) {
            console.log("\nWebhook deployment results:");
            console.table(webhookResults, ["webhook_name", "webhook_id", "deployed", "skipped", "response"]);
        }
        if (functionResults.length > 0) {
            console.log("Function deployment results:");
            console.table(functionResults, ["function_name", "function_id", "deployed", "skipped", "response"]);
        }
    }
}

function printStateChanges(stateChanges: StateComparisonResult) {
    // print a table showing the differences between the states
    const hasSubgraphs =
        stateChanges.subgraphs.added.length > 0 ||
        stateChanges.subgraphs.changed.length > 0 ||
        stateChanges.subgraphs.unchanged.length > 0 ||
        stateChanges.subgraphs.unreferenced.length > 0;
    if (hasSubgraphs) {
        console.log("Subgraphs:");
        if (stateChanges.subgraphs.added.length > 0) {
            console.log(" - To be created:");
            console.table(stateChanges.subgraphs.added, ["schema_name"]);
        }
        if (stateChanges.subgraphs.changed.length > 0) {
            console.log(" - Changed:");
            console.table(stateChanges.subgraphs.changed, ["schema_name"]);
        }
        if (stateChanges.subgraphs.unchanged.length > 0) {
            console.log(" - Unchanged:");
            console.table(stateChanges.subgraphs.unchanged, ["schema_name"]);
        }
        if (stateChanges.subgraphs.unreferenced.length > 0) {
            console.log(" - Unreferenced:");
            console.table(stateChanges.subgraphs.unreferenced, ["schema_name"]);
        }
    }

    const hasWebhooks =
        stateChanges.webhooks.added.length > 0 ||
        stateChanges.webhooks.changed.length > 0 ||
        stateChanges.webhooks.unchanged.length > 0 ||
        stateChanges.webhooks.unreferenced.length > 0;
    if (hasWebhooks) {
        console.log("Webhooks:");
        if (stateChanges.webhooks.added.length > 0) {
            console.log(" - To be created:");
            console.table(stateChanges.webhooks.added, ["webhook_name", "url"]);
        }
        if (stateChanges.webhooks.changed.length > 0) {
            console.log(" - Changed:");
            console.table(stateChanges.webhooks.changed, ["webhook_name", "url", "webhook_id", "changes"]);
        }
        if (stateChanges.webhooks.unchanged.length > 0) {
            console.log(" - Unchanged:");
            console.table(stateChanges.webhooks.unchanged, ["webhook_name", "url", "webhook_id"]);
        }
        if (stateChanges.webhooks.unreferenced.length > 0) {
            console.log(" - Unreferenced:");
            console.table(stateChanges.webhooks.unreferenced, ["webhook_name", "url", "webhook_id"]);
        }
    }

    const hasFunctions =
        stateChanges.functions.added.length > 0 ||
        stateChanges.functions.changed.length > 0 ||
        stateChanges.functions.unchanged.length > 0 ||
        stateChanges.functions.unreferenced.length > 0;
    if (hasFunctions) {
        console.log("Functions:");
        if (stateChanges.functions.added.length > 0) {
            console.log(" - To be created:");
            console.table(stateChanges.functions.added, [
                "function_name",
                "chain_id",
                "trigger_types",
                "webhook",
                "is_enabled",
                "should_send_std_streams",
            ]);
        }
        if (stateChanges.functions.changed.length > 0) {
            console.log(" - Changed:");
            console.table(stateChanges.functions.changed, [
                "function_name",
                "function_id",
                "chain_id",
                "webhook",
                "is_enabled",
                "should_send_std_streams",
                "changes",
            ]);
        }
        if (stateChanges.functions.unchanged.length > 0) {
            console.log(" - Unchanged:");
            console.table(stateChanges.functions.unchanged, [
                "function_name",
                "function_id",
                "chain_id",
                "trigger_types",
                "webhook",
                "is_enabled",
                "should_send_std_streams",
            ]);
        }
        if (stateChanges.functions.unreferenced.length > 0) {
            console.log(" - Unreferenced:");
            console.table(stateChanges.functions.unreferenced, [
                "function_name",
                "function_id",
                "chain_id",
                "trigger_types",
                "webhook",
                "is_enabled",
                "should_send_std_streams",
            ]);
        }
    }
}

export function addCommands(program: Command) {
    program
        .command("preview")
        .description("Preview the changes to be deployed.")
        .action(async () => {
            try {
                await deploy({ previewOnly: true });
            } catch (error: any) {
                console.error(parseError(error));
                process.exit(1);
            }
        });
    program
        .command("deploy")
        .description("Deploy your functions to SendBlocks.")
        .option("--dry-run", "Preview changes only.")
        .option("--non-interactive", "Deploy without asking for confirmation.")
        .action(async (options) => {
            try {
                await deploy(options);
            } catch (error: any) {
                console.error(parseError(error));
                process.exit(1);
            }
        });
}
