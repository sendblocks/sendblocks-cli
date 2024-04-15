import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import { ensureSendBlocksConfigured } from './config';

export const FUNCTION_CODE_FOLDER = "functions";
export const YAML_SOURCE_FOLDER = "src";
const CONFIG_FILE = "sendblocks.config.json";

type InitOptions = {
    force?: boolean;
    path?: string;
};

export async function getSetEnvironment(
    env: string,
    options: { projectPath?: string, quiet?: boolean } = {}
): Promise<void> {
    const projectPath: string = options.projectPath || path.resolve(process.cwd());
    ensureSendBlocksConfigured({ projectPath });

    if (env) {
        try {
            if (!options.quiet) {
                console.log("Setting configuration for", env);
            }
            // copy the config file for the target environment
            const sourcePath = env == "default" ?
                path.resolve(__dirname, `../${CONFIG_FILE}`) :
                path.resolve(__dirname, `../${CONFIG_FILE}.${env}`);
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

};

export async function init(options: InitOptions = {}) {
    const projectPath: string = path.resolve(options.path || process.cwd());
    console.log(`Initializing project at ${projectPath} ...`);

    const targetEnvPath = path.resolve(projectPath, CONFIG_FILE);
    const targetFunctionPath = path.resolve(projectPath, FUNCTION_CODE_FOLDER, "echo_function.ts");
    const targetGitignorePath = path.resolve(projectPath, ".gitignore");
    const targetReadmePath = path.resolve(projectPath, "README.md");
    const targetYamlPath = path.resolve(projectPath, YAML_SOURCE_FOLDER, "functions.yaml");

    const targetFiles = [targetEnvPath, targetFunctionPath, targetGitignorePath, targetReadmePath, targetYamlPath];

    if (fs.existsSync(projectPath)) {
        // check if any of the target files exists in the current directory
        const filesToBeOverwritten: string[] = [];
        for (const targetFile of targetFiles) {
            if (fs.existsSync(targetFile)) {
                filesToBeOverwritten.push(targetFile);
            }
        }

        if (filesToBeOverwritten.length > 0) {
            console.warn(`\nWARNING: The following files will be modified / overwritten:\n\t${filesToBeOverwritten.join(",\n\t")}\n`);
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
    const folders = [YAML_SOURCE_FOLDER, FUNCTION_CODE_FOLDER];
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

    // copy example function code to project folder
    const sourceFunctionPath = path.resolve(__dirname, "../public/echo_function.ts");
    fs.copyFileSync(sourceFunctionPath, targetFunctionPath);

    // copy PROJECT_README.md to project project
    const sourceReadmePath = path.resolve(__dirname, "../public/PROJECT_README.md");
    fs.copyFileSync(sourceReadmePath, targetReadmePath);

    // copy default config file to project folder
    const sourceEnvPath = path.resolve(__dirname, `../${CONFIG_FILE}`);
    fs.copyFileSync(sourceEnvPath, targetEnvPath);

    console.log("\nProject initialized successfully!");
}
