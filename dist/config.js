"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiUrl = exports.authUrl = exports.ensureSendBlocksConfigured = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CONFIG_FILE = "sendblocks.config.json";
function ensureSendBlocksConfigured(options = {}) {
    const projectPath = options.projectPath || path_1.default.resolve(process.cwd());
    const sendblocksFile = path_1.default.resolve(projectPath, CONFIG_FILE);
    if (!fs_1.default.existsSync(sendblocksFile)) {
        console.error('Please initialize the project before logging in.');
        process.exit(1);
    }
}
exports.ensureSendBlocksConfigured = ensureSendBlocksConfigured;
let configurationJson = {
    authUrl: "",
    apiUrl: "",
};
try {
    configurationJson = JSON.parse(fs_1.default.readFileSync(CONFIG_FILE, 'utf-8'));
}
catch (error) {
    // ignore this error here, we'll handle it where necessary
}
exports.authUrl = configurationJson.authUrl;
exports.apiUrl = configurationJson.apiUrl;
//# sourceMappingURL=config.js.map