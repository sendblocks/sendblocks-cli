#! /usr/bin/env node

import { Command } from "commander";
import { bin, description, version } from "../package.json";
import * as auth from "./auth";
import * as contracts from "./contracts";
import * as convert from "./convert";
import * as deploy from "./deploy";
import * as destroy from "./destroy";
import * as functions from "./functions";
import * as project from "./project";
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
