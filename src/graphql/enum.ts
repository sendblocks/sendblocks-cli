import type { EnumTypeDefinitionNode } from "graphql";

export class Enum {
    name: string;
    values: string[];

    constructor(node: EnumTypeDefinitionNode) {
        this.name = node.name.value;
        if (!node.values) {
            throw new Error(`Enum ${this.name} has no values`);
        }
        this.values = node.values.map((v) => v.name.value);
    }

    generateDefinition() {
        return `enum ${this.name} {
        ${this.values.map((v) => `${v} = "${v}"`).join(",\n")}
        }`;
    }
}
