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
