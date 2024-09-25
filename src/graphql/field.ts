import type { TypeNode } from "graphql";
import { Kind } from "graphql";

// GraphQL -> [TypeScript, JSON]
const typeMap: Record<string, [string, string]> = {
    ID: ["string", "string"],
    String: ["string", "string"],
    Bytes: ["string", "string"],

    Boolean: ["boolean", "boolean"],
    Timestamp: ["Date", "string"],

    Int: ["number", "number"],
    Float: ["number", "number"],
    BigInt: ["number", "number"],
    Int8: ["number", "number"],
    BigDecimal: ["number", "number"],
};

export class Field {
    name: string;
    type: FieldType;

    isEnum: boolean = false;
    enumName?: string;

    constructor(name: string, type: TypeNode, enums: string[]) {
        this.name = name;

        this.type = parseType(type);

        if (enums.includes(this.type.gql)) {
            this.isEnum = true;
            this.enumName = this.type.gql;
            this.type = {
                ...this.type,
                gql: this.type.gql,
                ts: this.type.gql,
                json: "string",
            };
        }
    }

    isRequired(): boolean {
        return this.type.nonNull;
    }

    getTSType(withNull: boolean): string {
        let typeString = this.type.ts;

        if (this.type.list) {
            typeString += "[]";
        }

        if (withNull && !this.type.nonNull) {
            typeString += " | null";
        }
        return typeString;
    }

    getJSONType(): string {
        let typeString = this.type.json;

        if (this.type.list) {
            typeString += "[]";
        }

        if (!this.type.nonNull) {
            typeString += " | null";
        }

        return typeString;
    }

    // ==============================================
    // ================ Parsing Code ================
    // ==============================================
    toRaw(value: string): string {
        if (this.type.list) {
            switch (this.type.gql) {
                case "Timestamp":
                    return `${value}.map((_${value}) => _${value}.toJSON())`;
                default:
                    // Handling of enums is trivial since the backing type is always a string.
                    // Handling of types without a conversion is, by definition, trivial.
                    return `${value}`;
            }
        }

        switch (this.type.gql) {
            case "Timestamp":
                return `${value}.toJSON()`;
            default:
                // Handling of enums is trivial since the backing type is always a string.
                // Handling of types without a conversion is, by definition, trivial.
                return `${value}`;
        }
    }

    fromRaw(rawObjectName: string): string {
        if (this.type.list) {
            switch (this.type.gql) {
                case "Timestamp":
                    return `${rawObjectName}.${this.name}.map((_${this.name}) => new Date(_${this.name}))`;
                default:
                    if (!this.isEnum) {
                        throw new Error(`Unknown type ${this.type.gql}`);
                    }
                    return `${rawObjectName}.${this.name}.map((_${this.name}) => ${this.enumName}[_${this.name}])`;
            }
        }

        switch (this.type.gql) {
            case "Timestamp":
                return `new Date(this.${rawObjectName}.${this.name})`;
            default:
                if (this.isEnum) {
                    return `${this.enumName}[this.${rawObjectName}.${this.name}]`;
                }
                return `this.${rawObjectName}.${this.name}`;
        }
    }

    getter(rawObjectName: string) {
        let getterString = `get ${this.name}(): ${this.getTSType(!this.isRequired())} {`;
        if (!this.isRequired()) {
            getterString += `
            if (this.${rawObjectName}.${this.name} === null) {
                return null;
            }
            `;
        }
        getterString += `
            return ${this.fromRaw(rawObjectName)};
        }`;
        return getterString;
    }

    setter(rawObjectName: string): string {
        let setterString = `set ${this.name}(value: ${this.getTSType(!this.isRequired())}) {`;
        if (!this.isRequired()) {
            setterString += `
            if (value === null) {
                this.${rawObjectName}.${this.name} = null;
                return;
            }
            `;
        }
        setterString += `
            this.${rawObjectName}.${this.name} = ${this.toRaw("value")};
        }`;
        return setterString;
    }
}

type FieldType = {
    gql: string;
    ts: string;
    json: string;

    list: boolean;
    nonNull: boolean;
};

function parseType(field: TypeNode): FieldType {
    let type: FieldType = {
        gql: "",
        ts: "",
        json: "",
        list: false,
        nonNull: false,
    };

    if (field.kind === Kind.NON_NULL_TYPE) {
        type.nonNull = true;
        field = field.type;
    }

    if (field.kind === Kind.LIST_TYPE) {
        type.list = true;
        field = field.type;
    }

    // Ignore this case for now as it's not relevant to the snippet

    //              [Int!]!
    //   This case -----^
    if (field.kind === Kind.NON_NULL_TYPE) {
        field = field.type;
    }

    if (field.kind !== Kind.NAMED_TYPE) {
        throw new Error(`Unknown field type kind: ${field.kind}`);
    }

    type.gql = field.name.value;
    if (typeMap[type.gql] === undefined) {
        [type.ts, type.json] = typeMap.ID;
    } else {
        [type.ts, type.json] = typeMap[type.gql];
    }

    return type;
}
