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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFetcher = void 0;
const openapi_typescript_fetch_1 = require("openapi-typescript-fetch");
const auth_1 = require("./auth");
const config_1 = require("./config");
function generateFetcher() {
    return __awaiter(this, void 0, void 0, function* () {
        if (config_1.apiUrl.length === 0) {
            console.error("Project environment has been corrupted, run 'sb-cli init' to reset.");
            process.exit(1);
        }
        const token = yield (0, auth_1.loadToken)();
        const fetcher = openapi_typescript_fetch_1.Fetcher.for();
        fetcher.configure({
            baseUrl: config_1.apiUrl,
            init: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });
        return fetcher;
    });
}
exports.generateFetcher = generateFetcher;
//# sourceMappingURL=fetcher.js.map