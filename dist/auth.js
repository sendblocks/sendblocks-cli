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
exports.addCommands = exports.refreshToken = exports.login = exports.loadToken = void 0;
const fs_1 = __importDefault(require("fs"));
const prompts_1 = __importDefault(require("prompts"));
const config_1 = require("./config");
const utils_1 = require("./utils");
function loadToken() {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO - always refresh the token, and if it cannot be refreshed then prompt the user to login
        //        see https://app.clickup.com/t/86945t08u
        try {
            const token = fs_1.default.readFileSync(".auth", "utf-8");
            if (token.length > 0) {
                return token;
            }
            throw new Error("Failed to load token from .auth file.");
        }
        catch (error) {
            console.error(`${error} Please login first:`);
            return yield login();
        }
    });
}
exports.loadToken = loadToken;
function login() {
    return __awaiter(this, arguments, void 0, function* (options = {}) {
        (0, config_1.ensureSendBlocksConfigured)();
        if (!config_1.authUrl || config_1.authUrl.length === 0) {
            console.error("Project environment is invalid, run 'sb-cli env reset' to reset.");
            process.exit(1);
        }
        let clientId = options.clientId;
        if (!clientId) {
            const clientIdInput = yield (0, prompts_1.default)({
                type: "text",
                name: "value",
                message: "Enter your SendBlocks Client ID",
            });
            if (!clientIdInput.value || clientIdInput.value.length === 0) {
                throw new Error("Client ID is required.");
            }
            clientId = clientIdInput.value;
        }
        const secretInput = yield (0, prompts_1.default)({
            type: "password",
            name: "value",
            message: "Enter your SendBlocks Secret",
        });
        if (!secretInput.value || secretInput.value.length === 0) {
            throw new Error("Secret is required.");
        }
        const secret = secretInput.value;
        // delete the .auth file
        try {
            fs_1.default.unlinkSync(".auth");
        }
        catch (error) {
            // ignore error
        }
        const response = yield fetch(config_1.authUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                clientId: clientId,
                secret: secret,
            }),
        });
        if (!response.ok) {
            throw new Error(`Failed to login, received status code ${response.status} ${response.statusText}`);
        }
        const data = yield response.json();
        yield fs_1.default.promises.writeFile(".auth", data.accessToken);
        yield fs_1.default.promises.writeFile(".refresh", data.refreshToken);
        console.log("Successfully logged in! Bearer token stored in .auth file.");
        console.log(`Bearer token: ${data.accessToken}\n\n`);
        return data.accessToken;
    });
}
exports.login = login;
function refreshToken() {
    return __awaiter(this, void 0, void 0, function* () {
        (0, config_1.ensureSendBlocksConfigured)();
        if (!config_1.refreshUrl || config_1.refreshUrl.length === 0) {
            console.error("Project environment is invalid, run 'sb-cli env reset' to reset.");
            process.exit(1);
        }
        let authToken;
        let refreshToken;
        try {
            authToken = yield fs_1.default.promises.readFile(".auth", "utf-8");
            refreshToken = yield fs_1.default.promises.readFile(".refresh", "utf-8");
        }
        catch (error) {
            console.error("Failed to read existing token files, please authenticate with `sb-cli login`.");
            process.exit(1);
        }
        const response = yield fetch(config_1.refreshUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                refreshToken: refreshToken,
            }),
        });
        if (!response.ok) {
            throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
        }
        const data = yield response.json();
        yield fs_1.default.promises.writeFile(".auth", data.access_token);
        yield fs_1.default.promises.writeFile(".refresh", data.refresh_token);
        console.log("Successfully refreshed token! Bearer token stored in .auth file.");
        console.log(`Bearer token: ${data.access_token}\n\n`);
        return data.access_token;
    });
}
exports.refreshToken = refreshToken;
function addCommands(program) {
    program
        .command("login")
        .description("Login with API credentials to retrieve a valid JWT token.")
        .option("--client-id <client-id>", "Client ID (optional, will prompt if not provided)")
        .option("--refresh", "Refresh the JWT token instead of logging in (cannot be used with --client-id)")
        .action((options) => __awaiter(this, void 0, void 0, function* () {
        try {
            if (options.refresh && !options.clientId) {
                yield refreshToken();
            }
            else {
                yield login(options);
            }
        }
        catch (error) {
            console.error((0, utils_1.parseError)(error));
            process.exit(1);
        }
    }));
}
exports.addCommands = addCommands;
//# sourceMappingURL=auth.js.map