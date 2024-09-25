import fs from "fs";
import path from "path";
import prettier from "prettier";

import { Entity } from "./entity";
import { Enum } from "./enum";
import { Field } from "./field";
import { getDefinitions } from "./parse";
import { PRETTIER_CONFIG } from "./utils";

export async function generateCode({ source, output }: { source: string; output: string }): Promise<string> {
    let outputFilePath = output || `${source}.ts`;

    const [typeDefs, enumDefs] = getDefinitions(source);

    const enums: string[] = [];

    let code = "";
    for (const enumType of enumDefs) {
        const enumObj = new Enum(enumType);

        enums.push(enumObj.name);
        code += enumObj.generateDefinition() + "\n";
    }

    code += "\n";

    const entities: Entity[] = [];
    for (const objectType of typeDefs) {
        const entityName = objectType.name.value;
        console.log(`[*] Generating code for entity ${entityName}`);
        const entity = new Entity(entityName);

        if (!objectType.fields) {
            console.error(`Object type ${objectType.name.value} has no fields`);
            continue;
        }

        let idFound = false;
        for (const fieldNode of objectType.fields) {
            if (fieldNode.directives && fieldNode.directives.length > 0) {
                if (fieldNode.directives.length > 1) {
                    throw new Error(`Field ${fieldNode.name.value} has more than one directive`);
                }

                const directive = fieldNode.directives[0];
                if (directive.name.value !== "derivedFrom") {
                    throw new Error(
                        `Field ${fieldNode.name.value} has an unknown directive \"${directive.name.value}\"`,
                    );
                }

                continue;
            }

            const fieldName = fieldNode.name.value;
            const fieldType = fieldNode.type;
            if (fieldName === "id") {
                idFound = true;
            }

            const field = new Field(fieldName, fieldType, enums);
            entity.addField(field);
        }

        if (!idFound) {
            throw new Error(`Object type ${objectType.name.value} has no id field`);
        }

        entities.push(entity);
    }

    for (const entity of entities) {
        code += entity.generateCode() + "\n";
    }
    code = await prettier.format(code, { parser: "typescript", ...PRETTIER_CONFIG });

    // Make the generated directory
    if (!fs.existsSync(outputFilePath)) {
        console.log("[*] Ensuring output directory exists...");
        fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
    }

    fs.writeFileSync(outputFilePath, code);
    return `\nCreated ${outputFilePath}`;
}
