"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertHexOrDecimal = exports.convertHexToDecimal = exports.convertDecimalToHex = void 0;
const convertDecimalToHex = (decimal) => {
    return decimal.toString(16);
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
//# sourceMappingURL=convert.js.map