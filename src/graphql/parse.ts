import fs from "fs";
import { Kind, parse } from "graphql";

import type { EnumTypeDefinitionNode, ObjectTypeDefinitionNode } from "graphql";

export function getDefinitions(sourceFilePath: string): [ObjectTypeDefinitionNode[], EnumTypeDefinitionNode[]] {
    // Read the schema file
    let schemaContent: string;
    try {
        schemaContent = fs.readFileSync(sourceFilePath, "utf8");
    } catch (err) {
        throw new Error(`File ${sourceFilePath} not found`);
    }

    // Parse the schema
    const parsedSchema = parse(schemaContent);

    // Get all of the ObjectTypeDefinition nodes
    const objectDefinitions: ObjectTypeDefinitionNode[] = parsedSchema.definitions.filter(
        (definition): definition is ObjectTypeDefinitionNode => definition.kind === Kind.OBJECT_TYPE_DEFINITION,
    );

    // Get all of the EnumTypeDefinition nodes
    const enumDefinitions: EnumTypeDefinitionNode[] = parsedSchema.definitions.filter(
        (definition): definition is EnumTypeDefinitionNode => definition.kind === Kind.ENUM_TYPE_DEFINITION,
    );

    return [objectDefinitions, enumDefinitions];
}
