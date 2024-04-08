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
exports.login = exports.loadToken = void 0;
const fs_1 = __importDefault(require("fs"));
require("dotenv/config");
const prompts_1 = __importDefault(require("prompts"));
const project_1 = require("./project");
function loadToken() {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO - always refresh the token, and if it cannot be refreshed then prompt the user to login
        //        see https://app.clickup.com/t/86945t08u
        try {
            const token = fs_1.default.readFileSync('.auth', 'utf-8');
            if (token.length > 0) {
                return token;
            }
            throw new Error('Failed to load token from .auth file.');
        }
        catch (error) {
            console.error(`${error} Please login first:`);
            return yield login();
        }
    });
}
exports.loadToken = loadToken;
function login() {
    return __awaiter(this, void 0, void 0, function* () {
        (0, project_1.ensureSendBlocksCLIProject)();
        const AUTH_URL = process.env['AUTH_URL'] || "";
        if (AUTH_URL.length === 0) {
            console.error("Project environment has been corrupted, run 'sb-cli init' to reset.");
            process.exit(1);
        }
        console.log(`Authenticating with FrontEgg...`);
        const clientId = yield (0, prompts_1.default)({
            type: 'text',
            name: 'value',
            message: 'Enter your FrontEgg Client ID',
        });
        const secret = yield (0, prompts_1.default)({
            type: 'password',
            name: 'value',
            message: 'Enter your FrontEgg Secret',
        });
        if (!clientId.value || clientId.value.length === 0 ||
            !secret.value || secret.value.length === 0) {
            throw new Error('Client ID and Secret are required.');
        }
        // delete the .auth file
        try {
            fs_1.default.unlinkSync('.auth');
        }
        catch (error) {
            // ignore error
        }
        let token;
        const response = yield fetch(AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                clientId: clientId.value,
                secret: secret.value,
            }),
        });
        if (!response.ok) {
            throw new Error(`Failed to login, received status code ${response.status} ${response.statusText}`);
        }
        const data = yield response.json();
        token = data.accessToken;
        yield fs_1.default.promises.writeFile('.auth', token);
        console.log('Successfully logged in! Bearer token stored in .auth file.');
        console.log(`Bearer token: ${token}\n\n`);
        return token;
    });
}
exports.login = login;
;
//# sourceMappingURL=auth.js.map