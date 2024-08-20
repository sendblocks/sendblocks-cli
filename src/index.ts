#! /usr/bin/env node

import { Command } from "commander";
import { bin, description, version } from "../package.json";
import { login } from "./auth";
import { convertHexOrDecimal } from "./convert";
import { deploy } from "./deploy";
import { destroy } from "./destroy";
import * as functions from "./functions";
import { getSetEnvironment, init } from "./project";
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

program
    .command("functions")
    .argument("<command>", "Command to execute [list, delete]")
    .argument("[name]", "Name of the function")
    .action(async (command, name) => {
        try {
            switch (command) {
                case "list":
                    console.log("Listing functions...");
                    console.log(await functions.listFunctions());
                    break;
                case "delete":
                    console.log("Deleting function...");
                    console.log(await functions.deleteFunction(name));
                    break;
                default:
                    console.error("Invalid command!");
            }
        } catch (error: any) {
            console.error(error.message);
            process.exit(1);
        }
    });

program
    .command("webhooks")
    .argument("<command>", "Command to execute [list, delete]")
    .argument("[name]", "Name of the webhook")
    .action(async (command, name) => {
        try {
            switch (command) {
                case "list":
                    console.log("Listing webhooks...");
                    console.log(await webhooks.listWebhooks());
                    break;
                case "delete":
                    console.log("Deleting webhook...");
                    console.log(await webhooks.deleteWebhook(name));
                    break;
                default:
                    console.error("Invalid command!");
            }
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
