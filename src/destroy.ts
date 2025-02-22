import prompts from "prompts";

import { Command } from "commander";
import * as functions from "./functions";
import { listYamlFiles, mergeYamlFiles } from "./sb-yaml";
import { generateStateChanges } from "./state-diff";
import * as subgraphs from "./subgraphs";
import * as webhooks from "./webhooks";

type StateComparisonResult = {
    subgraphs: ResourceStateChanges;
    webhooks: ResourceStateChanges;
    functions: ResourceStateChanges;
};

// destroy --dry-run
export async function destroy({ dryRun, nonInteractive }: { dryRun?: boolean; nonInteractive?: boolean } = {}) {
    // merge the yaml files into a single spec
    const spec = await mergeYamlFiles(listYamlFiles());

    const stateChanges = await generateStateChanges(spec);

    printStateChanges(stateChanges);

    if (dryRun) {
        console.log("Dry-run complete! No resources were destroyed.");
        return;
    }

    if (
        stateChanges.subgraphs.changed.length === 0 &&
        stateChanges.subgraphs.unchanged.length === 0 &&
        stateChanges.webhooks.changed.length === 0 &&
        stateChanges.webhooks.unchanged.length === 0 &&
        stateChanges.functions.changed.length === 0 &&
        stateChanges.functions.unchanged.length === 0
    ) {
        console.log("No resources to destroy");
        return;
    }

    let confirm;
    if (!nonInteractive) {
        // confirm changes with the user
        confirm = await prompts({
            type: "confirm",
            name: "value",
            message:
                "Please confirm that you have reviewed the changes and want to proceed with destroying the resources",
        });
    }

    if (nonInteractive || confirm?.value) {
        // deploy the changes
        console.log("Deploying changes...\n");

        const subgraphResults = await subgraphs.destroy(stateChanges.subgraphs);
        const functionResults = await functions.destroy(stateChanges.functions);
        const webhookResults = await webhooks.destroy(stateChanges.webhooks, functionResults);

        console.log("\nDeployment complete!");

        if (subgraphResults.length > 0) {
            console.log("Subgraph deployment results:");
            console.table(subgraphResults, ["schema_name", "destroyed", "skipped", "response"]);
        }
        if (functionResults.length > 0) {
            console.log("Function deployment results:");
            console.table(functionResults, ["function_name", "destroyed", "skipped", "response"]);
        }
        if (webhookResults.length > 0) {
            console.log("\nWebhook deployment results:");
            console.table(webhookResults, ["webhook_name", "destroyed", "skipped", "response"]);
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
        const combinedSubgraphChanges = [...stateChanges.subgraphs.changed, ...stateChanges.subgraphs.unchanged];
        if (combinedSubgraphChanges.length > 0) {
            console.log(" - To be destroyed:");
            console.table(combinedSubgraphChanges, ["schema_name"]);
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
        const combinedWebhookChanges = [...stateChanges.webhooks.changed, ...stateChanges.webhooks.unchanged];
        if (combinedWebhookChanges.length > 0) {
            console.log(" - To be destroyed:");
            console.table(combinedWebhookChanges, ["webhook_name", "url", "webhook_id"]);
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
        const combinedFunctionChanges = [...stateChanges.functions.changed, ...stateChanges.functions.unchanged];
        if (combinedFunctionChanges.length > 0) {
            console.log(" - To be destroyed:");
            console.table(combinedFunctionChanges, ["function_name", "function_id", "chain_id", "webhook"]);
        }
        if (stateChanges.functions.unreferenced.length > 0) {
            console.log(" - Unreferenced:");
            console.table(stateChanges.functions.unreferenced, [
                "function_name",
                "function_id",
                "chain_id",
                "trigger_types",
                "webhook",
            ]);
        }
    }
}

export function addCommands(program: Command) {
    program
        .command("destroy")
        .description("Delete the referenced resources on SendBlocks.")
        .option("--dry-run", "Preview destructive changes only.")
        .option("--non-interactive", "Delete without asking for confirmation.")
        .action(async (options: { dryRun: boolean; nonInteractive: boolean }) => {
            try {
                await destroy(options);
            } catch (error: any) {
                console.error(error.message);
                process.exit(1);
            }
        });
}
