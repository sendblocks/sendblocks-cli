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
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const package_json_1 = require("../package.json");
const auth = __importStar(require("./auth"));
const contracts = __importStar(require("./contracts"));
const convert = __importStar(require("./convert"));
const deploy = __importStar(require("./deploy"));
const destroy = __importStar(require("./destroy"));
const functions = __importStar(require("./functions"));
const project = __importStar(require("./project"));
const subgraphs = __importStar(require("./subgraphs"));
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
program.name(cliCommandNames[0]).version(package_json_1.version).description(package_json_1.description);
project.addCommands(program);
auth.addCommands(program);
deploy.addCommands(program);
destroy.addCommands(program);
contracts.addCommands(program);
functions.addCommands(program);
subgraphs.addCommands(program);
webhooks.addCommands(program);
convert.addCommands(program);
program.parse(process.argv);
//# sourceMappingURL=index.js.map