export const PRETTIER_CONFIG = {
    printWidth: 80,
    tabWidth: 4,
    useTabs: false,
    semi: true,
    singleQuote: false,
    bracketSpacing: true,
};

export function getDefaultValue(type: string): string {
    switch (type) {
        case "string":
            return `""`;
        case "number":
            return `0`;
        case "boolean":
            return `false`;
        case "Date":
            return `new Date()`;
    }

    throw new Error(`Unknown type: ${type}`);
}
