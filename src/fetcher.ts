import 'dotenv/config';
import { Fetcher } from 'openapi-typescript-fetch';

import { loadToken } from './auth';
import { paths } from './types/api';

export async function generateFetcher() {
    const apiUrl = process.env["API_URL"] || "";
    if (apiUrl.length === 0) {
        console.error("Project environment has been corrupted, run 'sb-cli init' to reset.");
        process.exit(1);
    }
    const token = await loadToken();
    const fetcher = Fetcher.for<paths>();
    fetcher.configure({
        baseUrl: apiUrl,
        init: {
            headers: {
            Authorization: `Bearer ${token}`
            },
        },
    })
    return fetcher;
}
