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
exports.mergeYamlFiles = exports.listYamlFiles = void 0;
const fs_1 = __importDefault(require("fs"));
const yaml_1 = require("yaml");
const project_1 = require("./project");
function listYamlFiles() {
    // get the list of yaml files in the yaml src folder
    const yamlFiles = fs_1.default
        .readdirSync(project_1.YAML_SOURCE_FOLDER)
        .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));
    console.log(`Found ${yamlFiles.length} yaml files in ${project_1.YAML_SOURCE_FOLDER} folder`);
    if (yamlFiles.length > 0) {
        console.log(" -", yamlFiles.join("\n - "));
    }
    return yamlFiles;
}
exports.listYamlFiles = listYamlFiles;
function mergeYamlFiles(yamlFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        const spec = {
            webhooks: {},
            functions: {},
        };
        for (const file of yamlFiles) {
            const yamlPath = `${project_1.YAML_SOURCE_FOLDER}/${file}`;
            const yamlContent = fs_1.default.readFileSync(yamlPath, "utf-8");
            const yaml = (0, yaml_1.parse)(yamlContent);
            for (const key of Object.keys(yaml)) {
                if (!Object.keys(spec).includes(key)) {
                    console.error(`Unsupported key found in yaml file ${yamlPath} : ${key}`);
                    process.exit(1);
                }
                // add item to spec while ensuring there're no duplicates
                for (const item of yaml[key]) {
                    const name = Object.keys(item)[0];
                    if (Object.keys(spec[key]).includes(name)) {
                        console.error(`Duplicate ${key} item found in ${yamlPath}: ${name}`);
                        process.exit(1);
                    }
                    spec[key][name] = item[name];
                }
            }
        }
        return spec;
    });
}
exports.mergeYamlFiles = mergeYamlFiles;
//# sourceMappingURL=sb-yaml.js.map