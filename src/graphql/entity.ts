import { Field } from "./field";

export class Entity {
    name: string;
    fields: Field[];

    rawObjectName: string = "_raw";

    constructor(name: string) {
        this.name = name;
        this.fields = [];
    }

    addField(field: Field) {
        this.fields.push(field);
    }

    private getGetterSetter(): string {
        return this.fields
            .map((field) => {
                return field.getter(this.rawObjectName) + "\n" + field.setter(this.rawObjectName);
            })
            .join("\n\n");
    }

    rawType(): string {
        return `{${this.fields.map((field) => `${field.name}: ${field.getJSONType()}`).join("\n")}}`;
    }

    inputType(): string {
        return `{${this.fields
            .map((field) => {
                if (field.isRequired()) {
                    return `${field.name}: ${field.getTSType(false)}`;
                }
                return `${field.name}?: ${field.getTSType(false)}`;
            })
            .join("\n")}}`;
    }

    generateConstructor(): string {
        const args = `input: ${this.inputType()}`;

        const requiredFieldAssignments = this.fields
            .filter((field) => field.isRequired())
            .map((field) => `${field.name}: ${field.toRaw(field.name)},`)
            .join("\n");

        const optionalFieldAssignments = this.fields
            .filter((field) => !field.isRequired())
            .map((field) => `${field.name}: null,`)
            .join("\n");

        return `constructor(${args}) {
        this._raw = {} as any;

        for (const key in input) {
            if (input[key] !== null) {
                this[key] = input[key];
            }
        }
    }`;
    }

    generateLoad(): string {
        const instanceName = this.name.toLowerCase();

        return `async static load(schema: string, id: string): Promise<${this.name} | null> {
        try {
            const raw = await sbcore.entities.Load(schema, "${this.name}", id);
            const ${instanceName} = new ${this.name}({} as any);
            ${instanceName}.setRaw(raw);
            return ${instanceName};
        } catch {
            return null;
        }
    }`;
    }

    // ================ Code Generation ================
    generateCode(): string {
        return `export class ${this.name} {
        private ${this.rawObjectName}: ${this.rawType()};

    ${this.generateConstructor()}

    async save(schema: string): Promise<void> {
        await sbcore.entities.Save(schema, "${this.name}", this._raw);
    }

    ${this.generateLoad()}

    setRaw(raw) {
        this._raw = raw;
    }
    
    ${this.getGetterSetter()}
}
`;
    }
}
