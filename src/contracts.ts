import { ApiResponse } from "openapi-typescript-fetch";
import { generateFetcher } from "./fetcher";
import { components } from "./types/api";

async function generateContractsApi() {
    const fetcher = await generateFetcher();

    const api = {
        analyzeContract: fetcher.path("/api/v1/contracts/{chain_id}/analyze").method("post").create(),
        getContract: fetcher.path("/api/v1/contracts/{chain_id}/{contract_address}/analysis").method("get").create(),
        getContractAbi: fetcher.path("/api/v1/contracts/{chain_id}/{contract_address}/abi").method("get").create(),
    };

    return api;
}

export async function analyzeContract(
    chainId: NonNullable<components["schemas"]["ChainNameEnum"]>,
    contractAddress: string,
) {
    const api = await generateContractsApi();
    await api.analyzeContract({ chain_id: chainId, contract_address: contractAddress });
}

export async function getAnalyzedContract(
    chainId: NonNullable<components["schemas"]["ChainNameEnum"]>,
    contractAddress: string,
    followProxy: boolean = true,
) {
    const api = await generateContractsApi();
    const items = [];
    let page = 1;
    let response: ApiResponse;
    do {
        response = await api.getContract({
            chain_id: chainId,
            contract_address: contractAddress,
            follow_proxy: followProxy,
            page: page++,
        });
        items.push(...response.data.items);
    } while (response.data.page < response.data.pages);
    return items;
}

export async function getContractAbi(
    chainId: NonNullable<components["schemas"]["ChainNameEnum"]>,
    contractAddress: string,
) {
    const api = await generateContractsApi();
    const response = await api.getContractAbi({
        chain_id: chainId,
        contract_address: contractAddress,
    });
    return response.data;
}
