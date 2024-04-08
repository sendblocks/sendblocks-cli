import fs from 'fs';
import path from 'path';
import prompts from 'prompts';

export const FUNCTION_CODE_FOLDER = "functions";
export const YAML_SOURCE_FOLDER = "src";

type InitOptions = {
    force?: boolean;
    path?: string;
};

export function ensureSendBlocksCLIProject(options: { projectPath?: string } = {}): void {
    const projectPath: string = options.projectPath || path.resolve(process.cwd());
    const sendblocksFile = path.resolve(projectPath, ".sendblocks");
    // ensure that .sendblocks file exists
    if (!fs.existsSync(sendblocksFile)) {
        console.error('Please initialize the project before logging in.');
        process.exit(1);
    }
}

export async function getSetEnvironment(
    env: string,
    options: { projectPath?: string, quiet?: boolean } = {}
): Promise<void> {
    const projectPath: string = options.projectPath || path.resolve(process.cwd());
    ensureSendBlocksCLIProject({ projectPath });

    if (env) {
        try {
            if (!options.quiet) {
                console.log("Setting environment to", env);
            }
            // copy the .env file for the target environment
            const sourcePath = env == "default" ?
                path.resolve(__dirname, `../.env`) :
                path.resolve(__dirname, `../.env.${env}`);
            const targetPath = path.resolve(projectPath, ".env");
            fs.copyFileSync(sourcePath, targetPath);
        } catch (error) {
            // this command isn't for public use, so be a bit less helpful
            console.error(`An error occurred!`);
            process.exit(1);
        }
    } else {
        // show current environment
        const envPath = path.resolve(projectPath, ".env");
        if (fs.existsSync(envPath)) {
            console.log("Current environment:");
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

    // ensure folder empty
    if (fs.existsSync(projectPath)) {
        const files = fs.readdirSync(projectPath, { withFileTypes: true }).map((file) => file.name);
        if (files.length > 0) {
            if (!options.force) {
                console.error("Folder is not empty! Use --force to initialize anyway.");
                process.exit(1);
            } else {
                console.log("Folder is not empty! Force initialization?");
                const confirm = await prompts({
                    type: "confirm",
                    name: "value",
                    message: "Are you sure you want to initialize the project?",
                });
                if (!confirm.value) {
                    console.log("Aborting initialization.");
                    process.exit(0);
                }
            }
        }
    }

    // create folder structure
    fs.mkdirSync(projectPath, { recursive: true });
    const folders = [YAML_SOURCE_FOLDER, FUNCTION_CODE_FOLDER];
    for (const folder of folders) {
        fs.mkdirSync(path.resolve(projectPath, folder), { recursive: true });
    }

    // copy .gitignore to project folder
    // the gitignore must be renamed to .gitignore, it cannot be .gitignore as the
    // npm pack and publish commands will take it into consideration
    const sourceGitignorePath = path.resolve(__dirname, "../public/gitignore");
    const targetGitignorePath = path.resolve(projectPath, ".gitignore");
    fs.copyFileSync(sourceGitignorePath, targetGitignorePath);

    // copy EXAMPLE_YAML.yaml to project folder
    const sourceYamlPath = path.resolve(__dirname, "../public/EXAMPLE_YAML.yaml");
    const targetYamlPath = path.resolve(projectPath, YAML_SOURCE_FOLDER, "functions.yaml");
    fs.copyFileSync(sourceYamlPath, targetYamlPath);

    // copy example function code to project folder
    const sourceFunctionPath = path.resolve(__dirname, "../public/echo_function.ts");
    const targetFunctionPath = path.resolve(projectPath, FUNCTION_CODE_FOLDER, "echo_function.ts");
    fs.copyFileSync(sourceFunctionPath, targetFunctionPath);

    // copy PROJECT_README.md to project project
    const sourceReadmePath = path.resolve(__dirname, "../public/PROJECT_README.md");
    const targetReadmePath = path.resolve(projectPath, "README.md");
    fs.copyFileSync(sourceReadmePath, targetReadmePath);

    // copy default .env file to project folder
    const sourceEnvPath = path.resolve(__dirname, "../.env");
    const targetEnvPath = path.resolve(projectPath, ".env");
    fs.copyFileSync(sourceEnvPath, targetEnvPath);

    // create hidden .sendblocks file to mark that project is appropriate to save .auth token
    const sendblocksPath = path.resolve(projectPath, ".sendblocks");
    fs.writeFileSync(sendblocksPath, "");

    console.log("Project initialized successfully!");
}
