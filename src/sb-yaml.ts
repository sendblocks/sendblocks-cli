import fs from 'fs';
import { parse } from 'yaml';

import { YAML_SOURCE_FOLDER } from './project';

export type Spec = Record<string, any>;

export function listYamlFiles(): string[] {
    // get the list of yaml files in the yaml src folder
    const yamlFiles = fs.readdirSync(YAML_SOURCE_FOLDER)
                        .filter(file => (file.endsWith('.yaml') || file.endsWith('.yml')));
    console.log(`Found ${yamlFiles.length} yaml files in ${YAML_SOURCE_FOLDER} folder`);
    if (yamlFiles.length > 0) {
        console.log(" -", yamlFiles.join('\n - '));
    }

    return yamlFiles;
}

export async function mergeYamlFiles(yamlFiles: string[]): Promise<Spec> {
    const spec: Spec = {
        webhooks: {},
        functions: {},
    };
    for (const file of yamlFiles) {
        const yamlPath = `${YAML_SOURCE_FOLDER}/${file}`;
        const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
        const yaml = parse(yamlContent);

        for (const key of Object.keys(yaml)) {
            if (!Object.keys(spec).includes(key)) {
                console.error(`Unsupported key found in yaml file ${yamlPath} : ${key}`);
                process.exit(1);
            }

            // add item to spec while ensuring there're no duplicates
            for (const item of yaml[key]) {
                const name = Object.keys(item)[0];
                if (Object.keys(spec[key]).includes(name)) {
                    console.error(`Duplicate ${key} item found in ${yamlPath}: ${name}`);
                    process.exit(1);
                }
                spec[key][name] = item[name];
            }
        }
    }
    return spec;
}
