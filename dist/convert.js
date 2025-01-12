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
exports.addCommands = exports.forceHexOrDecimalToDecimal = exports.convertStringToBase64 = exports.convertBase64ToString = exports.convertHexOrDecimal = exports.convertHexToDecimal = exports.convertDecimalToHex = void 0;
const fs_1 = __importDefault(require("fs"));
const utils_1 = require("./utils");
const convertDecimalToHex = (decimal) => {
    return `0x${decimal.toString(16)}`;
};
exports.convertDecimalToHex = convertDecimalToHex;
const convertHexToDecimal = (hex) => {
    return parseInt(hex, 16);
};
exports.convertHexToDecimal = convertHexToDecimal;
const convertHexOrDecimal = (value) => {
    if (value.startsWith("0x") || /[a-fA-F]+/.test(value)) {
        // ensure string only includes 0-9 and a-f
        if (!/^[0-9a-fA-F]+$/.test(value.slice(2))) {
            throw new Error("Invalid hex string!");
        }
        return (0, exports.convertHexToDecimal)(value);
    }
    else {
        // ensure string only includes 0-9
        if (!/^\d+$/.test(value)) {
            throw new Error("Invalid decimal string!");
        }
        return (0, exports.convertDecimalToHex)(parseInt(value));
    }
};
exports.convertHexOrDecimal = convertHexOrDecimal;
function convertBase64ToString(base64Code) {
    return Buffer.from(base64Code, "base64").toString("utf-8");
}
exports.convertBase64ToString = convertBase64ToString;
function convertStringToBase64(str) {
    return Buffer.from(str).toString("base64");
}
exports.convertStringToBase64 = convertStringToBase64;
function convertStreamToOrFromBase64(_a) {
    return __awaiter(this, arguments, void 0, function* ({ converterFunction, }) {
        return yield new Promise((resolve) => {
            let stdinString = "";
            const stdin = process.stdin;
            stdin.setEncoding("utf-8");
            stdin.on("data", (chunk) => {
                stdinString += chunk.toString();
            });
            stdin.on("end", () => {
                if (!stdinString) {
                    throw new Error("No source provided!");
                }
                resolve(converterFunction(stdinString));
            });
        });
    });
}
function decodeBase64(_a) {
    return __awaiter(this, arguments, void 0, function* ({ source, file, output }) {
        let decodedString;
        if (file) {
            const fileContents = fs_1.default.readFileSync(file, "utf-8");
            decodedString = convertBase64ToString(fileContents);
        }
        else {
            if (source) {
                decodedString = convertBase64ToString(source);
            }
            else {
                decodedString = yield convertStreamToOrFromBase64({ converterFunction: convertBase64ToString });
            }
        }
        if (output) {
            fs_1.default.writeFileSync(output, decodedString, { encoding: "utf-8" });
            return `Base64-decoded string saved to ${output}`;
        }
        return decodedString;
    });
}
function encodeBase64(_a) {
    return __awaiter(this, arguments, void 0, function* ({ source, file, output }) {
        let encodedString;
        if (file) {
            const fileContents = fs_1.default.readFileSync(file, "utf-8");
            encodedString = convertStringToBase64(fileContents);
        }
        else {
            if (source) {
                encodedString = convertStringToBase64(source);
            }
            else {
                encodedString = yield convertStreamToOrFromBase64({ converterFunction: convertStringToBase64 });
            }
        }
        if (output) {
            fs_1.default.writeFileSync(output, encodedString, { encoding: "utf-8" });
            return `Base64-encoded string saved to ${output}`;
        }
        return encodedString;
    });
}
function forceHexOrDecimalToDecimal(value) {
    if (value.toString().substring(0, 2) === "0x") {
        return (0, exports.convertHexToDecimal)(value.toString());
    }
    return Number(value);
}
exports.forceHexOrDecimalToDecimal = forceHexOrDecimalToDecimal;
function addCommands(program) {
    program
        .command("hex")
        .description("Convert to or from hexadecimal and decimal")
        .argument("<value>", "Hexadecimal or decimal string to convert")
        .action((val) => {
        try {
            console.log((0, exports.convertHexOrDecimal)(val));
        }
        catch (error) {
            console.error((0, utils_1.parseError)(error));
            process.exit(1);
        }
    });
    const base64Command = program.command("base64");
    const base64encodeCommand = base64Command.command("encode");
    const base64decodeCommand = base64Command.command("decode");
    base64encodeCommand
        .description("Encode text to base64")
        .argument("[source]", "Optional string to encode. If neither source nor file is provided, input will be read from stdin")
        .option("-f, --file <source file path>", "Source file path, if neither source nor file is provided then input will be read from stdin")
        .option("-o, --output <output file path>", "Output file path, if not provided then output will be printed to stdout)")
        .action((source, options) => __awaiter(this, void 0, void 0, function* () {
        try {
            options.stdin = !source && !options.file;
            console.log(yield encodeBase64(Object.assign({ source }, options)));
        }
        catch (error) {
            console.error(error.message);
            process.exit(1);
        }
    }));
    base64decodeCommand
        .description("Decode base64 to text")
        .argument("[source]", "Optional Base64 string to decode. If neither source nor file is provided, input will be read from stdin")
        .option("-f, --file <source file path>", "Source file path, if neither source nor file is provided then input will be read from stdin")
        .option("-o, --output <output file path>", "Output file path, if not provided then output will be printed to stdout")
        .action((source, options) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(yield decodeBase64(Object.assign({ source }, options)));
        }
        catch (error) {
            console.error(error.message);
            process.exit(1);
        }
    }));
}
exports.addCommands = addCommands;
//# sourceMappingURL=convert.js.map