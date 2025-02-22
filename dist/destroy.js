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
exports.addCommands = exports.destroy = void 0;
const prompts_1 = __importDefault(require("prompts"));
const functions = __importStar(require("./functions"));
const sb_yaml_1 = require("./sb-yaml");
const state_diff_1 = require("./state-diff");
const subgraphs = __importStar(require("./subgraphs"));
const webhooks = __importStar(require("./webhooks"));
// destroy --dry-run
function destroy() {
    return __awaiter(this, arguments, void 0, function* ({ dryRun, nonInteractive } = {}) {
        // merge the yaml files into a single spec
        const spec = yield (0, sb_yaml_1.mergeYamlFiles)((0, sb_yaml_1.listYamlFiles)());
        const stateChanges = yield (0, state_diff_1.generateStateChanges)(spec);
        printStateChanges(stateChanges);
        if (dryRun) {
            console.log("Dry-run complete! No resources were destroyed.");
            return;
        }
        if (stateChanges.subgraphs.changed.length === 0 &&
            stateChanges.subgraphs.unchanged.length === 0 &&
            stateChanges.webhooks.changed.length === 0 &&
            stateChanges.webhooks.unchanged.length === 0 &&
            stateChanges.functions.changed.length === 0 &&
            stateChanges.functions.unchanged.length === 0) {
            console.log("No resources to destroy");
            return;
        }
        let confirm;
        if (!nonInteractive) {
            // confirm changes with the user
            confirm = yield (0, prompts_1.default)({
                type: "confirm",
                name: "value",
                message: "Please confirm that you have reviewed the changes and want to proceed with destroying the resources",
            });
        }
        if (nonInteractive || (confirm === null || confirm === void 0 ? void 0 : confirm.value)) {
            // deploy the changes
            console.log("Deploying changes...\n");
            const subgraphResults = yield subgraphs.destroy(stateChanges.subgraphs);
            const functionResults = yield functions.destroy(stateChanges.functions);
            const webhookResults = yield webhooks.destroy(stateChanges.webhooks, functionResults);
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
    });
}
exports.destroy = destroy;
function printStateChanges(stateChanges) {
    // print a table showing the differences between the states
    const hasSubgraphs = stateChanges.subgraphs.added.length > 0 ||
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
    const hasWebhooks = stateChanges.webhooks.added.length > 0 ||
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
    const hasFunctions = stateChanges.functions.added.length > 0 ||
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
function addCommands(program) {
    program
        .command("destroy")
        .description("Delete the referenced resources on SendBlocks.")
        .option("--dry-run", "Preview destructive changes only.")
        .option("--non-interactive", "Delete without asking for confirmation.")
        .action((options) => __awaiter(this, void 0, void 0, function* () {
        try {
            yield destroy(options);
        }
        catch (error) {
            console.error(error.message);
            process.exit(1);
        }
    }));
}
exports.addCommands = addCommands;
//# sourceMappingURL=destroy.js.map