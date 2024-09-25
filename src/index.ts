#! /usr/bin/env node

import { Command } from "commander";
import { bin, description, version } from "../package.json";
import { login } from "./auth";
import { convertHexOrDecimal } from "./convert";
import { deploy } from "./deploy";
import { destroy } from "./destroy";
import * as functions from "./functions";
import { generateCode } from "./graphql/codegen";
import { getSetEnvironment, init } from "./project";
import * as subgraphs from "./subgraphs";
import * as webhooks from "./webhooks";

const program = new Command();

const cliCommandNames = Object.keys(bin);
if (cliCommandNames.length !== 1) {
    // this limitation is to make the CLI's usage printout safe, if we decide
    // we want to support multiple commands, we should change the way we handle
    // the usage display
    console.error("Exactly one binary name must be defined in package.json!");
    process.exit(1);
}

program.name(cliCommandNames[0]).version(version).description(description);

program
    .command("env", { hidden: true })
    .description("Get or set the current environment variables.")
    .argument("[env]", `Reset corrupted .env variables with "default", or leave empty to show current configuration.`)
    .action(async (env: string) => {
        try {
            await getSetEnvironment(env);
        } catch (error: any) {
            console.error(error.message);
            process.exit(1);
        }
    });

program
    .command("login")
    .description("Login with API credentials to retrieve a valid JWT token.")
    .action(async () => {
        try {
            await login();
        } catch (error: any) {
            console.error(error.message);
            process.exit(1);
        }
    });

program
    .command("init")
    .description("Initialize a new project.")
    .argument("[path]", "Path to the project folder.")
    .action(async (path) => {
        try {
            await init({ path });
        } catch (error: any) {
            console.error(error.message);
            process.exit(1);
        }
    });

program
    .command("preview")
    .description("Preview the changes to be deployed.")
    .action(async () => {
        try {
            await deploy({ previewOnly: true });
        } catch (error: any) {
            console.error(error.message);
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
            console.error(error.message);
            process.exit(1);
        }
    });

program
    .command("destroy")
    .description("Delete the referenced resources on SendBlocks.")
    .option("--dry-run", "Preview destructive changes only.")
    .option("--non-interactive", "Delete without asking for confirmation.")
    .action(async (options) => {
        try {
            await destroy(options);
        } catch (error: any) {
            console.error(error.message);
            process.exit(1);
        }
    });

const functionsCommand = program.command("functions");
functionsCommand
    .command("list")
    .description("List all functions.")
    .action(async () => {
        try {
            console.log("Listing functions...");
            console.log(await functions.listFunctions());
        } catch (error: any) {
            console.error(error.message);
            process.exit(1);
        }
    });
functionsCommand
    .command("delete")
    .description("Delete a function.")
    .argument("<name>", "Name of the function")
    .action(async (name) => {
        try {
            console.log("Deleting function...");
            console.log(await functions.deleteFunction(name));
        } catch (error: any) {
            console.error(error.message);
            process.exit(1);
        }
    });
functionsCommand
    .command("replay-blocks")
    .description("Replay blocks for a given set of functions.")
    .option("--start <start block>", "Start block number (decimal or hex)")
    .option("--end <end block>", "End block number (decimal or hex)")
    .option("--functions <functions>", "Comma-separated list of function names")
    .action(async (options: any) => {
        const missingArgs = ["start", "end"].filter((arg) => !options[arg]);
        if (missingArgs.length > 0) {
            console.error(`Missing required argument(s): ${missingArgs.join(", ")}`);
            process.exit(1);
        }
        try {
            let functionNames: string[] = [];
            if (options.functions) {
                functionNames = options.functions.split(",").map((f: string) => f.trim());
            }
            const functionsText =
                functionNames.length > 0
                    ? `functions ${JSON.stringify(functionNames)}`
                    : "all deployed functions in spec";
            console.log(`Replaying blocks ${options.start} through ${options.end} for ${functionsText}...`);
            await functions.replayBlocks(functionNames, options.start, options.end);
        } catch (error: any) {
            console.error(error.message);
            process.exit(1);
        }
    });

const webhooksCommand = program.command("webhooks");
webhooksCommand
    .command("list")
    .description("List all webhooks.")
    .action(async () => {
        try {
            console.log("Listing webhooks...");
            console.log(await webhooks.listWebhooks());
        } catch (error: any) {
            console.error(error.message);
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
            console.log(await webhooks.deleteWebhook(name));
        } catch (error: any) {
            console.error(error.message);
            process.exit(1);
        }
    });

const subgraphsCommand = program.command("subgraphs");
subgraphsCommand
    .command("list")
    .description("List all subgraph schemas.")
    .action(async () => {
        try {
            console.log("Listing subgraph schemas...");
            console.log(await subgraphs.listSubgraphSchemas({ warnOnAccessDenied: true }));
        } catch (error: any) {
            console.log(`index error`, error);
            console.error(error.message);
            process.exit(1);
        }
    });
subgraphsCommand
    .command("delete")
    .description("Delete a subgraph schema.")
    .argument("<name>", "Name of the subgraph schema")
    .action(async (name) => {
        try {
            console.log("Deleting subgraph schema...");
            console.log(await subgraphs.deleteSubgraphSchema(name));
        } catch (error: any) {
            console.error(error.message);
            process.exit(1);
        }
    });
subgraphsCommand
    .command("gen")
    .description("Generate typescript types from a graphql file")
    .option("-s, --source <file>", "Path to the graphql file, defaults to schema.graphql", "schema.graphql")
    .option("-o, --output <file>", "Path to the output file, defaults to <source file>.ts")
    .action(async (options) => {
        try {
            console.log(await generateCode(options));
        } catch (error: any) {
            console.error(error.message);
            process.exit(1);
        }
    });

program
    .command("hex")
    .description("Convert to or from hexadecimal and decimal")
    .argument("<value>", "Hexadecimal or decimal string to convert")
    .action((val) => {
        try {
            console.log(convertHexOrDecimal(val));
        } catch (error: any) {
            console.error(error.message);
            process.exit(1);
        }
    });

program.parse(process.argv);
