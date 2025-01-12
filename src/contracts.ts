import { Command } from "commander";
import { ApiResponse } from "openapi-typescript-fetch";
import { generateFetcher } from "./fetcher";
import { components } from "./types/api";
import { parseError } from "./utils";

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

export function addCommands(program: Command) {
    const contractsCommand = program.command("contracts");
    contractsCommand
        .command("analyze")
        .description("Analyze or get information about a contract.")
        .argument("<chain_id>", "Chain ID")
        .argument("<contract_address>", "Contract address")
        .action(async (chainId, contractAddress, options) => {
            try {
                console.log("Analyzing contract...");
                await analyzeContract(chainId, contractAddress);
            } catch (error: any) {
                console.error(parseError(error));
                process.exit(1);
            }
        });

    contractsCommand
        .command("analysis")
        .description("Get the result of a contract analysis.")
        .argument("<chain_id>", "Chain ID")
        .argument("<contract_address>", "Contract address")
        .option("--follow-proxy", "Follow the proxy contract address (default)")
        .option("--no-follow-proxy", "Do not follow the proxy contract address")
        .action(async (chainId, contractAddress, options) => {
            try {
                console.log("Getting contract...");
                console.log(await getAnalyzedContract(chainId, contractAddress, options.followProxy));
            } catch (error: any) {
                console.error(parseError(error));
                process.exit(1);
            }
        });

    contractsCommand
        .command("abi")
        .description("Get the ABI of a contract.")
        .argument("<chain_id>", "Chain ID")
        .argument("<contract_address>", "Contract address")
        .action(async (chainId, contractAddress) => {
            try {
                console.log(await getContractAbi(chainId, contractAddress));
            } catch (error: any) {
                console.error(parseError(error));
                process.exit(1);
            }
        });
}
