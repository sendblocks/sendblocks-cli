import { ApiResponse } from "openapi-typescript-fetch";
import { generateFetcher } from "./fetcher";

async function generateSubgraphsApi() {
    const fetcher = await generateFetcher();

    const api = {
        createSubgraphSchema: fetcher.path("/api/v1/subgraph/schema").method("post").create(),
        listSubgraphSchemas: fetcher.path("/api/v1/subgraph").method("get").create(),
        getSubgraphSchema: fetcher.path("/api/v1/subgraph/schema/{schema_name}").method("get").create(),
        deleteSubgraphSchema: fetcher.path("/api/v1/subgraph/schema/{schema_name}").method("delete").create(),
    };

    return api;
}

export function isSubgraphChanged(name: string, sendblocksSubgraph: any, specSubgraph: any) {
    return sendblocksSubgraph.schema !== specSubgraph.schema;
}

export async function listSubgraphSchemas({ warnOnAccessDenied = false }: { warnOnAccessDenied?: boolean } = {}) {
    const api = await generateSubgraphsApi();
    const subgraphs = [];
    let page = 1;
    let response: ApiResponse;
    try {
        do {
            response = await api.listSubgraphSchemas({ page: page++ });
            subgraphs.push(...response.data.items);
        } while (response.data.page < response.data.pages);
    } catch (error: any) {
        switch (error.status) {
            case 403:
                if (warnOnAccessDenied) {
                    console.warn(
                        `Access to subgraphs is forbidden. If you wish to deploy subgraphs, please request the necessary permissions for your API key.`,
                    );
                }
                return [];
            default:
                throw new Error(`Error occurred while listing subgraph schemas: ${error.status} ${error.statusText}`);
        }
    }
    return subgraphs;
}

export async function getSubgraphSchema(schema_name: string) {
    const api = await generateSubgraphsApi();
    try {
        const response = await api.getSubgraphSchema({ schema_name });
        return response;
    } catch (error) {
        throw new Error(`Error occurred while getting subgraph ${name}: ${error}`);
    }
}

export async function getSubgraphDictionary({ warnOnAccessDenied = false }: { warnOnAccessDenied?: boolean } = {}) {
    const returnObject: { [name: string]: any } = {};
    const subgraphsList = await listSubgraphSchemas({ warnOnAccessDenied });
    if (subgraphsList) {
        for (const schemaName of subgraphsList) {
            const schema = await getSubgraphSchema(schemaName);
            returnObject[schemaName] = schema.data.schema;
        }
    }
    return returnObject;
}

export async function deleteSubgraphSchema(
    schema_name: string,
    { warnOnAccessDenied = false }: { warnOnAccessDenied?: boolean } = {},
) {
    const api = await generateSubgraphsApi();
    const subgraphs = await getSubgraphDictionary({ warnOnAccessDenied });
    const sendblocksSubgraphSchema = subgraphs[schema_name];
    if (!sendblocksSubgraphSchema) {
        throw new Error(`Subgraph ${schema_name} not found`);
    }
    try {
        const response = await api.deleteSubgraphSchema({ schema_name });
        return response;
    } catch (error) {
        throw new Error(`Error occurred while deleting subgraph schema ${schema_name}: ${error}`);
    }
}

export async function deploy(stateChanges: ResourceStateChanges) {
    const api = await generateSubgraphsApi();
    const results = [];
    for (const addedSubgraph of stateChanges.added) {
        console.log(`Creating subgraph schema ${addedSubgraph.schema_name}...`);
        try {
            const response = await api.createSubgraphSchema({
                name: addedSubgraph.schema_name,
                schema: addedSubgraph.schema,
            });
            if (response.ok) {
                results.push({
                    deployed: true,
                    schema_name: addedSubgraph.schema_name,
                });
            } else {
                throw new Error(`${response.status} ${response.statusText}`);
            }
        } catch (error) {
            results.push({
                deployed: false,
                schema_name: addedSubgraph.schema_name,
                response: `${error}`,
            });
        }
    }
    for (const updatedSubgraph of stateChanges.changed) {
        console.log(`Skipping subgraph schema ${updatedSubgraph.schema_name}...`);
        results.push({
            skipped: true,
            schema_name: updatedSubgraph.schema_name,
            response: `Subgraph schema updates not supported`,
        });
    }

    for (const unchangedSubgraph of [...stateChanges.unchanged, ...stateChanges.unreferenced]) {
        results.push({
            skipped: true,
            schema_name: unchangedSubgraph.schema_name,
        });
    }

    return results;
}

export async function destroy(stateChanges: ResourceStateChanges) {
    const api = await generateSubgraphsApi();
    const results = [];

    const subgraphSchemasToDelete = [...stateChanges.changed, ...stateChanges.unchanged];

    for (const subgraphSchemaToDelete of subgraphSchemasToDelete) {
        console.log(`Deleting subgraph schema ${subgraphSchemaToDelete.schema_name}...`);
        try {
            const response = await api.deleteSubgraphSchema({ schema_name: subgraphSchemaToDelete.schema_name });
            if (response.ok) {
                results.push({
                    schema_name: subgraphSchemaToDelete.schema_name,
                    destroyed: true,
                });
            } else {
                throw new Error(`${response.status} ${response.statusText}`);
            }
        } catch (error) {
            results.push({
                destroyed: false,
                schema_name: subgraphSchemaToDelete.schema_name,
                response: `${error}`,
            });
        }
    }

    return results;
}
