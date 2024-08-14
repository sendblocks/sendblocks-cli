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
const convert_1 = require("./convert");
const deploy_1 = require("./deploy");
const destroy_1 = require("./destroy");
const functions = __importStar(require("./functions"));
const project_1 = require("./project");
const webhooks = __importStar(require("./webhooks"));
const program = new commander_1.Command();
const cliCommandNames = Object.keys(package_json_1.bin);
if (cliCommandNames.length !== 1) {
    // this limitation is to make the CLI's usage printout safe, if we decide
    // we want to support multiple commands, we should change the way we handle
    // the usage display
    console.error("Exactly one binary name must be defined in package.json!");
    process.exit(1);
}
program
    .name(cliCommandNames[0])
    .version(package_json_1.version)
    .description(package_json_1.description);
program
    .command("env", { hidden: true })
    .description("Get or set the current environment variables.")
    .argument("[env]", `Reset corrupted .env variables with "default", or leave empty to show current configuration.`)
    .action((env) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, project_1.getSetEnvironment)(env);
    }
    catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}));
program
    .command("login")
    .description("Login with API credentials to retrieve a valid JWT token.")
    .action(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, auth_1.login)();
    }
    catch (error) {
        console.error(error.message);
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
        console.error(error.message);
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
        console.error(error.message);
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
        console.error(error.message);
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
program
    .command("functions")
    .argument("<command>", "Command to execute [list, delete]")
    .argument("[name]", "Name of the function")
    .action((command, name) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        switch (command) {
            case "list":
                console.log("Listing functions...");
                console.log(yield functions.listFunctions());
                break;
            case "delete":
                console.log("Deleting function...");
                console.log(yield functions.deleteFunction(name));
                break;
            default:
                console.error("Invalid command!");
        }
    }
    catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}));
program
    .command("webhooks")
    .argument("<command>", "Command to execute [list, delete]")
    .argument("[name]", "Name of the webhook")
    .action((command, name) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        switch (command) {
            case "list":
                console.log("Listing webhooks...");
                console.log(yield webhooks.listWebhooks());
                break;
            case "delete":
                console.log("Deleting webhook...");
                console.log(yield webhooks.deleteWebhook(name));
                break;
            default:
                console.error("Invalid command!");
        }
    }
    catch (error) {
        console.error(error.message);
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
        console.error(error.message);
        process.exit(1);
    }
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map