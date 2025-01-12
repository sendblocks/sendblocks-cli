import { Command } from "commander";
import fs from "fs";
import { parseError } from "./utils";
export const convertDecimalToHex = (decimal: number) => {
    return `0x${decimal.toString(16)}`;
};

export const convertHexToDecimal = (hex: string) => {
    return parseInt(hex, 16);
};

export const convertHexOrDecimal = (value: string) => {
    if (value.startsWith("0x") || /[a-fA-F]+/.test(value)) {
        // ensure string only includes 0-9 and a-f
        if (!/^[0-9a-fA-F]+$/.test(value.slice(2))) {
            throw new Error("Invalid hex string!");
        }
        return convertHexToDecimal(value);
    } else {
        // ensure string only includes 0-9
        if (!/^\d+$/.test(value)) {
            throw new Error("Invalid decimal string!");
        }
        return convertDecimalToHex(parseInt(value));
    }
};

export function convertBase64ToString(base64Code: string) {
    return Buffer.from(base64Code, "base64").toString("utf-8");
}

export function convertStringToBase64(str: string) {
    return Buffer.from(str).toString("base64");
}

async function convertStreamToOrFromBase64({
    converterFunction,
}: {
    converterFunction: (str: string) => string;
}): Promise<string> {
    return await new Promise((resolve) => {
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
}

async function decodeBase64({ source, file, output }: { source: string; file?: string; output?: string }) {
    let decodedString: string;
    if (file) {
        const fileContents = fs.readFileSync(file, "utf-8");
        decodedString = convertBase64ToString(fileContents);
    } else {
        if (source) {
            decodedString = convertBase64ToString(source);
        } else {
            decodedString = await convertStreamToOrFromBase64({ converterFunction: convertBase64ToString });
        }
    }
    if (output) {
        fs.writeFileSync(output, decodedString, { encoding: "utf-8" });
        return `Base64-decoded string saved to ${output}`;
    }
    return decodedString;
}

async function encodeBase64({ source, file, output }: { source: string; file?: string; output?: string }) {
    let encodedString: string;
    if (file) {
        const fileContents = fs.readFileSync(file, "utf-8");
        encodedString = convertStringToBase64(fileContents);
    } else {
        if (source) {
            encodedString = convertStringToBase64(source);
        } else {
            encodedString = await convertStreamToOrFromBase64({ converterFunction: convertStringToBase64 });
        }
    }
    if (output) {
        fs.writeFileSync(output, encodedString, { encoding: "utf-8" });
        return `Base64-encoded string saved to ${output}`;
    }
    return encodedString;
}

export function forceHexOrDecimalToDecimal(value: string | number): number {
    if (value.toString().substring(0, 2) === "0x") {
        return convertHexToDecimal(value.toString());
    }

    return Number(value);
}

export function addCommands(program: Command) {
    program
        .command("hex")
        .description("Convert to or from hexadecimal and decimal")
        .argument("<value>", "Hexadecimal or decimal string to convert")
        .action((val) => {
            try {
                console.log(convertHexOrDecimal(val));
            } catch (error: any) {
                console.error(parseError(error));
                process.exit(1);
            }
        });

    const base64Command = program.command("base64");
    const base64encodeCommand = base64Command.command("encode");
    const base64decodeCommand = base64Command.command("decode");

    base64encodeCommand
        .description("Encode text to base64")
        .argument(
            "[source]",
            "Optional string to encode. If neither source nor file is provided, input will be read from stdin",
        )
        .option(
            "-f, --file <source file path>",
            "Source file path, if neither source nor file is provided then input will be read from stdin",
        )
        .option(
            "-o, --output <output file path>",
            "Output file path, if not provided then output will be printed to stdout)",
        )
        .action(async (source, options: any) => {
            try {
                options.stdin = !source && !options.file;
                console.log(await encodeBase64({ source, ...options }));
            } catch (error: any) {
                console.error(error.message);
                process.exit(1);
            }
        });

    base64decodeCommand
        .description("Decode base64 to text")
        .argument(
            "[source]",
            "Optional Base64 string to decode. If neither source nor file is provided, input will be read from stdin",
        )
        .option(
            "-f, --file <source file path>",
            "Source file path, if neither source nor file is provided then input will be read from stdin",
        )
        .option(
            "-o, --output <output file path>",
            "Output file path, if not provided then output will be printed to stdout",
        )
        .action(async (source, options: any) => {
            try {
                console.log(await decodeBase64({ source, ...options }));
            } catch (error: any) {
                console.error(error.message);
                process.exit(1);
            }
        });
}
