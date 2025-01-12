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
exports.addCommands = exports.deploy = void 0;
const prompts_1 = __importDefault(require("prompts"));
const functions = __importStar(require("./functions"));
const sb_yaml_1 = require("./sb-yaml");
const state_diff_1 = require("./state-diff");
const subgraphs = __importStar(require("./subgraphs"));
const utils_1 = require("./utils");
const webhooks = __importStar(require("./webhooks"));
function deploy() {
    return __awaiter(this, arguments, void 0, function* ({ dryRun, nonInteractive, previewOnly, } = {}) {
        // merge the yaml files into a single spec
        const spec = yield (0, sb_yaml_1.mergeYamlFiles)((0, sb_yaml_1.listYamlFiles)());
        const stateChanges = yield (0, state_diff_1.generateStateChanges)(spec);
        printStateChanges(stateChanges);
        if (previewOnly) {
            return;
        }
        if (dryRun) {
            console.log("Dry-run complete! No changes were deployed.");
            return;
        }
        if (stateChanges.subgraphs.added.length === 0 &&
            stateChanges.webhooks.added.length === 0 &&
            stateChanges.functions.added.length === 0 &&
            stateChanges.subgraphs.changed.length === 0 &&
            stateChanges.webhooks.changed.length === 0 &&
            stateChanges.functions.changed.length === 0) {
            console.log("No changes to deploy");
            return;
        }
        let confirm;
        if (!nonInteractive) {
            // confirm changes with the user
            confirm = yield (0, prompts_1.default)({
                type: "confirm",
                name: "value",
                message: "Please confirm that you have reviewed the changes and want to proceed with the deployment",
            });
        }
        if (nonInteractive || (confirm === null || confirm === void 0 ? void 0 : confirm.value)) {
            // deploy the changes
            console.log("Deploying changes...\n");
            const subgraphResults = yield subgraphs.deploy(stateChanges.subgraphs);
            const webhookResults = yield webhooks.deploy(stateChanges.webhooks);
            const functionResults = yield functions.deploy(stateChanges.functions, webhookResults);
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
    });
}
exports.deploy = deploy;
function printStateChanges(stateChanges) {
    // print a table showing the differences between the states
    const hasSubgraphs = stateChanges.subgraphs.added.length > 0 ||
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
    const hasWebhooks = stateChanges.webhooks.added.length > 0 ||
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
    const hasFunctions = stateChanges.functions.added.length > 0 ||
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
function addCommands(program) {
    program
        .command("preview")
        .description("Preview the changes to be deployed.")
        .action(() => __awaiter(this, void 0, void 0, function* () {
        try {
            yield deploy({ previewOnly: true });
        }
        catch (error) {
            console.error((0, utils_1.parseError)(error));
            process.exit(1);
        }
    }));
    program
        .command("deploy")
        .description("Deploy your functions to SendBlocks.")
        .option("--dry-run", "Preview changes only.")
        .option("--non-interactive", "Deploy without asking for confirmation.")
        .action((options) => __awaiter(this, void 0, void 0, function* () {
        try {
            yield deploy(options);
        }
        catch (error) {
            console.error((0, utils_1.parseError)(error));
            process.exit(1);
        }
    }));
}
exports.addCommands = addCommands;
//# sourceMappingURL=deploy.js.map