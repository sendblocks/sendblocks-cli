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
exports.init = exports.getSetEnvironment = exports.YAML_SOURCE_FOLDER = exports.TARGET_YAML_FILE = exports.SAMPLES_CODE_FOLDER = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prompts_1 = __importDefault(require("prompts"));
const config_1 = require("./config");
exports.SAMPLES_CODE_FOLDER = "samples";
exports.TARGET_YAML_FILE = "samples.yaml";
exports.YAML_SOURCE_FOLDER = "src";
const CONFIG_FILE = "sendblocks.config.json";
function getSetEnvironment(env_1) {
    return __awaiter(this, arguments, void 0, function* (env, options = {}) {
        const projectPath = options.projectPath || path_1.default.resolve(process.cwd());
        (0, config_1.ensureSendBlocksConfigured)({ projectPath });
        if (env) {
            try {
                if (!options.quiet) {
                    console.log("Setting configuration for", env);
                }
                // copy the config file for the target environment
                const sourcePath = env == "default"
                    ? path_1.default.resolve(__dirname, `../${CONFIG_FILE}`)
                    : path_1.default.resolve(__dirname, `../${CONFIG_FILE}.${env}`);
                const targetPath = path_1.default.resolve(projectPath, CONFIG_FILE);
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
            const envPath = path_1.default.resolve(projectPath, CONFIG_FILE);
            if (fs_1.default.existsSync(envPath)) {
                console.log("Current configuration:");
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
function init() {
    return __awaiter(this, arguments, void 0, function* (options = {}) {
        const projectPath = path_1.default.resolve(options.path || process.cwd());
        console.log(`Initializing project at ${projectPath} ...`);
        const targetEnvPath = path_1.default.resolve(projectPath, CONFIG_FILE);
        const targetSamplesPath = path_1.default.resolve(projectPath, exports.SAMPLES_CODE_FOLDER);
        const targetGitignorePath = path_1.default.resolve(projectPath, ".gitignore");
        const targetReadmePath = path_1.default.resolve(projectPath, "README.md");
        const targetYamlPath = path_1.default.resolve(projectPath, exports.YAML_SOURCE_FOLDER, exports.TARGET_YAML_FILE);
        const targetFiles = [targetEnvPath, targetSamplesPath, targetGitignorePath, targetReadmePath, targetYamlPath];
        if (fs_1.default.existsSync(projectPath)) {
            // check if any of the target files exists in the current directory
            const filesToBeOverwritten = [];
            for (const targetFile of targetFiles) {
                if (fs_1.default.existsSync(targetFile)) {
                    filesToBeOverwritten.push(targetFile);
                }
            }
            if (filesToBeOverwritten.length > 0) {
                console.warn(`\nWARNING: The following files or folders will be modified / overwritten:\n\t${filesToBeOverwritten.join(",\n\t")}\n`);
                const confirm = yield (0, prompts_1.default)({
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
        fs_1.default.mkdirSync(projectPath, { recursive: true });
        const folders = [exports.YAML_SOURCE_FOLDER, exports.SAMPLES_CODE_FOLDER];
        for (const folder of folders) {
            fs_1.default.mkdirSync(path_1.default.resolve(projectPath, folder), { recursive: true });
        }
        // copy / append to .gitignore in project folder
        // the source sendblocks-cli gitignore must not be named .gitignore, as the npm pack and
        // publish commands will take it into consideration
        const sourceGitignorePath = path_1.default.resolve(__dirname, "../public/gitignore");
        if (fs_1.default.existsSync(targetGitignorePath)) {
            const gitignoreContent = fs_1.default.readFileSync(sourceGitignorePath, "utf-8");
            fs_1.default.appendFileSync(targetGitignorePath, gitignoreContent);
        }
        else {
            fs_1.default.copyFileSync(sourceGitignorePath, targetGitignorePath);
        }
        // copy EXAMPLE_YAML.yaml to project folder
        const sourceYamlPath = path_1.default.resolve(__dirname, "../public/EXAMPLE_YAML.yaml");
        fs_1.default.copyFileSync(sourceYamlPath, targetYamlPath);
        // copy code samples to project folder
        const sourceSamplesPath = path_1.default.resolve(__dirname, `../public/${exports.SAMPLES_CODE_FOLDER}`);
        fs_1.default.cpSync(sourceSamplesPath, targetSamplesPath, { recursive: true });
        // copy PROJECT_README.md to project project
        const sourceReadmePath = path_1.default.resolve(__dirname, "../public/PROJECT_README.md");
        fs_1.default.copyFileSync(sourceReadmePath, targetReadmePath);
        // copy default config file to project folder
        const sourceEnvPath = path_1.default.resolve(__dirname, `../${CONFIG_FILE}`);
        fs_1.default.copyFileSync(sourceEnvPath, targetEnvPath);
        console.log("\nProject initialized successfully!");
    });
}
exports.init = init;
//# sourceMappingURL=project.js.map