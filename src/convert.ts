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

export function forceHexOrDecimalToDecimal(value: string | number): number {
    if (value.toString().substring(0, 2) === "0x") {
        return convertHexToDecimal(value.toString());
    }

    return Number(value);
}
