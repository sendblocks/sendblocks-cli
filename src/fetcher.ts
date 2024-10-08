import { Fetcher } from "openapi-typescript-fetch";

import { loadToken } from "./auth";
import { apiUrl } from "./config";
import { paths } from "./types/api";

export async function generateFetcher() {
    if (!apiUrl || apiUrl.length === 0) {
        console.error("Project environment is invalid, run 'sb-cli env reset' to reset.");
        process.exit(1);
    }
    const token = await loadToken();
    const fetcher = Fetcher.for<paths>();
    fetcher.configure({
        baseUrl: apiUrl,
        init: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
    return fetcher;
}
