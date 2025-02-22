import { Command } from "commander";
import fs from "fs";
import path from "path";
import prompts from "prompts";
import { ensureSendBlocksConfigured } from "./config";
import { parseError } from "./utils";

export const SAMPLES_CODE_FOLDER = "samples";
export const TARGET_YAML_FILE = "samples.yaml";
export const YAML_SOURCE_FOLDER = "src";
const CONFIG_FILE = "sendblocks.config.json";

type InitOptions = {
    force?: boolean;
    path?: string;
};

export async function getSetEnvironment(
    env: string,
    options: { projectPath?: string; quiet?: boolean } = {},
): Promise<void> {
    const projectPath: string = options.projectPath || path.resolve(process.cwd());
    ensureSendBlocksConfigured({ projectPath });

    if (env) {
        try {
            if (!options.quiet) {
                console.log(env == "reset" ? "Resetting configuration..." : `Setting configuration (${env})...`);
            }
            // copy the config file for the target environment
            const sourcePath =
                env == "reset"
                    ? path.resolve(__dirname, `../${CONFIG_FILE}`)
                    : path.resolve(__dirname, `../${CONFIG_FILE}.${env}`);
            const targetPath = path.resolve(projectPath, CONFIG_FILE);
            fs.copyFileSync(sourcePath, targetPath);
        } catch (error) {
            // this command isn't for public use, so be a bit less helpful
            console.error(`An error occurred!`);
            process.exit(1);
        }
    } else {
        // show current environment
        const envPath = path.resolve(projectPath, CONFIG_FILE);
        if (fs.existsSync(envPath)) {
            console.log("Current configuration:");
            const envContent = fs.readFileSync(envPath, "utf-8");
            console.log(envContent);
        } else {
            console.log("No environment set.");
        }
    }
}

export async function init(options: InitOptions = {}) {
    const projectPath: string = path.resolve(options.path || process.cwd());
    console.log(`Initializing project at ${projectPath} ...`);

    const targetEnvPath = path.resolve(projectPath, CONFIG_FILE);
    const targetSamplesPath = path.resolve(projectPath, SAMPLES_CODE_FOLDER);
    const targetGitignorePath = path.resolve(projectPath, ".gitignore");
    const targetReadmePath = path.resolve(projectPath, "README.md");
    const targetYamlPath = path.resolve(projectPath, YAML_SOURCE_FOLDER, TARGET_YAML_FILE);

    const targetFiles = [targetEnvPath, targetSamplesPath, targetGitignorePath, targetReadmePath, targetYamlPath];

    if (fs.existsSync(projectPath)) {
        // check if any of the target files exists in the current directory
        const filesToBeOverwritten: string[] = [];
        for (const targetFile of targetFiles) {
            if (fs.existsSync(targetFile)) {
                filesToBeOverwritten.push(targetFile);
            }
        }

        if (filesToBeOverwritten.length > 0) {
            console.warn(
                `\nWARNING: The following files or folders will be modified / overwritten:\n\t${filesToBeOverwritten.join(",\n\t")}\n`,
            );
            const confirm = await prompts({
                type: "confirm",
                name: "value",
                message: "Are you sure you want to continue with the project initialization?",
            });
            if (!confirm.value) {
                console.log("Aborting initialization.");
                process.exit(0);
            }
        }
    }

    // create folder structure
    fs.mkdirSync(projectPath, { recursive: true });
    const folders = [YAML_SOURCE_FOLDER, SAMPLES_CODE_FOLDER];
    for (const folder of folders) {
        fs.mkdirSync(path.resolve(projectPath, folder), { recursive: true });
    }

    // copy / append to .gitignore in project folder
    // the source sendblocks-cli gitignore must not be named .gitignore, as the npm pack and
    // publish commands will take it into consideration
    const sourceGitignorePath = path.resolve(__dirname, "../public/gitignore");
    if (fs.existsSync(targetGitignorePath)) {
        const gitignoreContent = fs.readFileSync(sourceGitignorePath, "utf-8");
        fs.appendFileSync(targetGitignorePath, gitignoreContent);
    } else {
        fs.copyFileSync(sourceGitignorePath, targetGitignorePath);
    }

    // copy EXAMPLE_YAML.yaml to project folder
    const sourceYamlPath = path.resolve(__dirname, "../public/EXAMPLE_YAML.yaml");
    fs.copyFileSync(sourceYamlPath, targetYamlPath);

    // copy code samples to project folder
    const sourceSamplesPath = path.resolve(__dirname, `../public/${SAMPLES_CODE_FOLDER}`);
    fs.cpSync(sourceSamplesPath, targetSamplesPath, { recursive: true });

    // copy PROJECT_README.md to project project
    const sourceReadmePath = path.resolve(__dirname, "../public/PROJECT_README.md");
    fs.copyFileSync(sourceReadmePath, targetReadmePath);

    // copy default config file to project folder
    const sourceEnvPath = path.resolve(__dirname, `../${CONFIG_FILE}`);
    fs.copyFileSync(sourceEnvPath, targetEnvPath);

    console.log("\nProject initialized successfully!");
}

export function addCommands(program: Command) {
    program
        .command("env", { hidden: true })
        .description("Get or reset the current environment variables.")
        .argument("[env]", `Reset corrupted .env variables with "reset", or leave empty to show current configuration.`)
        .action(async (env: string) => {
            try {
                await getSetEnvironment(env);
            } catch (error: any) {
                console.error(parseError(error));
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
                console.error(parseError(error));
                process.exit(1);
            }
        });
}
