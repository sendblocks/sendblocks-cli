"use strict";
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
exports.init = exports.getSetEnvironment = exports.ensureSendBlocksCLIProject = exports.YAML_SOURCE_FOLDER = exports.FUNCTION_CODE_FOLDER = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prompts_1 = __importDefault(require("prompts"));
exports.FUNCTION_CODE_FOLDER = "functions";
exports.YAML_SOURCE_FOLDER = "src";
function ensureSendBlocksCLIProject(options = {}) {
    const projectPath = options.projectPath || path_1.default.resolve(process.cwd());
    const sendblocksFile = path_1.default.resolve(projectPath, ".sendblocks");
    // ensure that .sendblocks file exists
    if (!fs_1.default.existsSync(sendblocksFile)) {
        console.error('Please initialize the project before logging in.');
        process.exit(1);
    }
}
exports.ensureSendBlocksCLIProject = ensureSendBlocksCLIProject;
function getSetEnvironment(env_1) {
    return __awaiter(this, arguments, void 0, function* (env, options = {}) {
        const projectPath = options.projectPath || path_1.default.resolve(process.cwd());
        ensureSendBlocksCLIProject({ projectPath });
        if (env) {
            try {
                if (!options.quiet) {
                    console.log("Setting environment to", env);
                }
                // copy the .env file for the target environment
                const sourcePath = env == "default" ?
                    path_1.default.resolve(__dirname, `../.env`) :
                    path_1.default.resolve(__dirname, `../.env.${env}`);
                const targetPath = path_1.default.resolve(projectPath, ".env");
                fs_1.default.copyFileSync(sourcePath, targetPath);
            }
            catch (error) {
                // this command isn't for public use, so be a bit less helpful
                console.error(`An error occurred!`);
                process.exit(1);
            }
        }
        else {
            // show current environment
            const envPath = path_1.default.resolve(projectPath, ".env");
            if (fs_1.default.existsSync(envPath)) {
                console.log("Current environment:");
                const envContent = fs_1.default.readFileSync(envPath, "utf-8");
                console.log(envContent);
            }
            else {
                console.log("No environment set.");
            }
        }
    });
}
exports.getSetEnvironment = getSetEnvironment;
;
function init() {
    return __awaiter(this, arguments, void 0, function* (options = {}) {
        const projectPath = path_1.default.resolve(options.path || process.cwd());
        console.log(`Initializing project at ${projectPath} ...`);
        // ensure folder empty
        if (fs_1.default.existsSync(projectPath)) {
            const files = fs_1.default.readdirSync(projectPath, { withFileTypes: true }).map((file) => file.name);
            if (files.length > 0) {
                if (!options.force) {
                    console.error("Folder is not empty! Use --force to initialize anyway.");
                    process.exit(1);
                }
                else {
                    console.log("Folder is not empty! Force initialization?");
                    const confirm = yield (0, prompts_1.default)({
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
        fs_1.default.mkdirSync(projectPath, { recursive: true });
        const folders = [exports.YAML_SOURCE_FOLDER, exports.FUNCTION_CODE_FOLDER];
        for (const folder of folders) {
            fs_1.default.mkdirSync(path_1.default.resolve(projectPath, folder), { recursive: true });
        }
        // copy .gitignore to project folder
        const sourceGitignorePath = path_1.default.resolve(__dirname, "../public/.gitignore");
        const targetGitignorePath = path_1.default.resolve(projectPath, ".gitignore");
        fs_1.default.copyFileSync(sourceGitignorePath, targetGitignorePath);
        // copy EXAMPLE_YAML.yaml to project folder
        const sourceYamlPath = path_1.default.resolve(__dirname, "../public/EXAMPLE_YAML.yaml");
        const targetYamlPath = path_1.default.resolve(projectPath, exports.YAML_SOURCE_FOLDER, "functions.yaml");
        fs_1.default.copyFileSync(sourceYamlPath, targetYamlPath);
        // copy example function code to project folder
        const sourceFunctionPath = path_1.default.resolve(__dirname, "../public/echo_function.ts");
        const targetFunctionPath = path_1.default.resolve(projectPath, exports.FUNCTION_CODE_FOLDER, "echo_function.ts");
        fs_1.default.copyFileSync(sourceFunctionPath, targetFunctionPath);
        // copy PROJECT_README.md to project project
        const sourceReadmePath = path_1.default.resolve(__dirname, "../public/PROJECT_README.md");
        const targetReadmePath = path_1.default.resolve(projectPath, "README.md");
        fs_1.default.copyFileSync(sourceReadmePath, targetReadmePath);
        // copy default .env file to project folder
        const sourceEnvPath = path_1.default.resolve(__dirname, "../.env");
        const targetEnvPath = path_1.default.resolve(projectPath, ".env");
        fs_1.default.copyFileSync(sourceEnvPath, targetEnvPath);
        // create hidden .sendblocks file to mark that project is appropriate to save .auth token
        const sendblocksPath = path_1.default.resolve(projectPath, ".sendblocks");
        fs_1.default.writeFileSync(sendblocksPath, "");
        console.log("Project initialized successfully!");
    });
}
exports.init = init;
//# sourceMappingURL=project.js.map