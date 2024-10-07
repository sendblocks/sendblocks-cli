#! /usr/bin/env node
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
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const package_json_1 = require("../package.json");
const auth_1 = require("./auth");
const contracts = __importStar(require("./contracts"));
const convert_1 = require("./convert");
const deploy_1 = require("./deploy");
const destroy_1 = require("./destroy");
const functions = __importStar(require("./functions"));
const codegen_1 = require("./graphql/codegen");
const project_1 = require("./project");
const subgraphs = __importStar(require("./subgraphs"));
const webhooks = __importStar(require("./webhooks"));
function parseError(error) {
    var _a;
    let errorMessage = error.message;
    if ((_a = error.data) === null || _a === void 0 ? void 0 : _a.detail) {
        errorMessage += `: ${error.data.detail}`;
    }
    return errorMessage;
}
const program = new commander_1.Command();
const cliCommandNames = Object.keys(package_json_1.bin);
if (cliCommandNames.length !== 1) {
    // this limitation is to make the CLI's usage printout safe, if we decide
    // we want to support multiple commands, we should change the way we handle
    // the usage display
    console.error("Exactly one binary name must be defined in package.json!");
    process.exit(1);
}
program.name(cliCommandNames[0]).version(package_json_1.version).description(package_json_1.description);
program
    .command("env", { hidden: true })
    .description("Get or reset the current environment variables.")
    .argument("[env]", `Reset corrupted .env variables with "reset", or leave empty to show current configuration.`)
    .action((env) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, project_1.getSetEnvironment)(env);
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
program
    .command("login")
    .description("Login with API credentials to retrieve a valid JWT token.")
    .option("--refresh", "Refresh the JWT token instead of logging in")
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (options.refresh) {
            yield (0, auth_1.refreshToken)();
        }
        else {
            yield (0, auth_1.login)();
        }
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
program
    .command("init")
    .description("Initialize a new project.")
    .argument("[path]", "Path to the project folder.")
    .action((path) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, project_1.init)({ path });
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
program
    .command("preview")
    .description("Preview the changes to be deployed.")
    .action(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, deploy_1.deploy)({ previewOnly: true });
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
program
    .command("deploy")
    .description("Deploy your functions to SendBlocks.")
    .option("--dry-run", "Preview changes only.")
    .option("--non-interactive", "Deploy without asking for confirmation.")
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, deploy_1.deploy)(options);
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
program
    .command("destroy")
    .description("Delete the referenced resources on SendBlocks.")
    .option("--dry-run", "Preview destructive changes only.")
    .option("--non-interactive", "Delete without asking for confirmation.")
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, destroy_1.destroy)(options);
    }
    catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}));
const contractsCommand = program.command("contracts");
contractsCommand
    .command("analyze")
    .description("Analyze or get information about a contract.")
    .argument("<chain_id>", "Chain ID")
    .argument("<contract_address>", "Contract address")
    .action((chainId, contractAddress, options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Analyzing contract...");
        yield contracts.analyzeContract(chainId, contractAddress);
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
contractsCommand
    .command("analysis")
    .description("Get the result of a contract analysis.")
    .argument("<chain_id>", "Chain ID")
    .argument("<contract_address>", "Contract address")
    .option("--follow-proxy", "Follow the proxy contract address (default)")
    .option("--no-follow-proxy", "Do not follow the proxy contract address")
    .action((chainId, contractAddress, options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Getting contract...");
        console.log(yield contracts.getAnalyzedContract(chainId, contractAddress, options.followProxy));
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
contractsCommand
    .command("abi")
    .description("Get the ABI of a contract.")
    .argument("<chain_id>", "Chain ID")
    .argument("<contract_address>", "Contract address")
    .action((chainId, contractAddress) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(yield contracts.getContractAbi(chainId, contractAddress));
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
const functionsCommand = program.command("functions");
functionsCommand
    .command("list")
    .description("List all functions.")
    .action(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Listing functions...");
        functions.prettyPrint(yield functions.listFunctions());
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
functionsCommand
    .command("delete")
    .description("Delete a function.")
    .argument("<name>", "Name of the function")
    .action((name) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Deleting function...");
        console.log(yield functions.deleteFunction(name));
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
functionsCommand
    .command("replay-blocks")
    .description("Replay blocks for a given set of functions.")
    .option("--start <start block>", "Start block number (decimal or hex)")
    .option("--end <end block>", "End block number (decimal or hex)")
    .option("--functions <functions>", "Comma-separated list of function names")
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    const missingArgs = ["start", "end"].filter((arg) => !options[arg]);
    if (missingArgs.length > 0) {
        console.error(`Missing required argument(s): ${missingArgs.join(", ")}`);
        process.exit(1);
    }
    try {
        let functionNames = [];
        if (options.functions) {
            functionNames = options.functions.split(",").map((f) => f.trim());
        }
        const functionsText = functionNames.length > 0
            ? `functions ${JSON.stringify(functionNames)}`
            : "all deployed functions in spec";
        console.log(`Replaying blocks ${options.start} through ${options.end} for ${functionsText}...`);
        yield functions.replayBlocks(functionNames, options.start, options.end);
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
const subgraphsCommand = program.command("subgraphs");
subgraphsCommand
    .command("list")
    .description("List all subgraph schemas.")
    .action(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Listing subgraph schemas...");
        console.log(yield subgraphs.listSubgraphSchemas({ warnOnAccessDenied: true }));
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
subgraphsCommand
    .command("delete")
    .description("Delete a subgraph schema.")
    .argument("<name>", "Name of the subgraph schema")
    .action((name) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Deleting subgraph schema...");
        console.log(yield subgraphs.deleteSubgraphSchema(name));
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
subgraphsCommand
    .command("gen")
    .description("Generate typescript types from a graphql file")
    .option("-s, --source <file>", "Path to the graphql file, defaults to schema.graphql", "schema.graphql")
    .option("-o, --output <file>", "Path to the output file, defaults to <source file>.ts")
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(yield (0, codegen_1.generateCode)(options));
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
const webhooksCommand = program.command("webhooks");
webhooksCommand
    .command("list")
    .description("List all webhooks.")
    .action(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Listing webhooks...");
        console.log(yield webhooks.listWebhooks());
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
webhooksCommand
    .command("delete")
    .description("Delete a webhook.")
    .argument("<name>", "Name of the webhook")
    .action((name) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Deleting webhook...");
        console.log(yield webhooks.deleteWebhook(name));
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
}));
program
    .command("hex")
    .description("Convert to or from hexadecimal and decimal")
    .argument("<value>", "Hexadecimal or decimal string to convert")
    .action((val) => {
    try {
        console.log((0, convert_1.convertHexOrDecimal)(val));
    }
    catch (error) {
        console.error(parseError(error));
        process.exit(1);
    }
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map