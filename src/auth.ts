import fs from "fs";

import { Command } from "commander";
import prompts from "prompts";
import { authUrl, ensureSendBlocksConfigured, refreshUrl } from "./config";
import { parseError } from "./utils";

export async function loadToken() {
    // TODO - always refresh the token, and if it cannot be refreshed then prompt the user to login
    //        see https://app.clickup.com/t/86945t08u
    try {
        const token = fs.readFileSync(".auth", "utf-8");
        if (token.length > 0) {
            return token;
        }
        throw new Error("Failed to load token from .auth file.");
    } catch (error) {
        console.error(`${error} Please login first:`);
        return await login();
    }
}

export async function login(options: { clientId?: string } = {}): Promise<string> {
    ensureSendBlocksConfigured();

    if (!authUrl || authUrl.length === 0) {
        console.error("Project environment is invalid, run 'sb-cli env reset' to reset.");
        process.exit(1);
    }

    let clientId = options.clientId;
    if (!clientId) {
        const clientIdInput = await prompts({
            type: "text",
            name: "value",
            message: "Enter your SendBlocks Client ID",
        });

        if (!clientIdInput.value || clientIdInput.value.length === 0) {
            throw new Error("Client ID is required.");
        }
        clientId = clientIdInput.value;
    }

    const secretInput = await prompts({
        type: "password",
        name: "value",
        message: "Enter your SendBlocks Secret",
    });

    if (!secretInput.value || secretInput.value.length === 0) {
        throw new Error("Secret is required.");
    }

    const secret = secretInput.value;

    // delete the .auth file
    try {
        fs.unlinkSync(".auth");
    } catch (error) {
        // ignore error
    }

    const response: Response = await fetch(authUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            clientId: clientId,
            secret: secret,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to login, received status code ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    await fs.promises.writeFile(".auth", data.accessToken);
    await fs.promises.writeFile(".refresh", data.refreshToken);
    console.log("Successfully logged in! Bearer token stored in .auth file.");
    console.log(`Bearer token: ${data.accessToken}\n\n`);
    return data.accessToken;
}

export async function refreshToken(): Promise<string> {
    ensureSendBlocksConfigured();

    if (!refreshUrl || refreshUrl.length === 0) {
        console.error("Project environment is invalid, run 'sb-cli env reset' to reset.");
        process.exit(1);
    }

    let authToken: string;
    let refreshToken: string;
    try {
        authToken = await fs.promises.readFile(".auth", "utf-8");
        refreshToken = await fs.promises.readFile(".refresh", "utf-8");
    } catch (error) {
        console.error("Failed to read existing token files, please authenticate with `sb-cli login`.");
        process.exit(1);
    }

    const response: Response = await fetch(refreshUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            refreshToken: refreshToken,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    await fs.promises.writeFile(".auth", data.access_token);
    await fs.promises.writeFile(".refresh", data.refresh_token);

    console.log("Successfully refreshed token! Bearer token stored in .auth file.");
    console.log(`Bearer token: ${data.access_token}\n\n`);
    return data.access_token;
}

export function addCommands(program: Command) {
    program
        .command("login")
        .description("Login with API credentials to retrieve a valid JWT token.")
        .option("--client-id <client-id>", "Client ID (optional, will prompt if not provided)")
        .option("--refresh", "Refresh the JWT token instead of logging in (cannot be used with --client-id)")
        .action(async (options: { clientId: string; refresh: boolean }) => {
            try {
                if (options.refresh && !options.clientId) {
                    await refreshToken();
                } else {
                    await login(options);
                }
            } catch (error: any) {
                console.error(parseError(error));
                process.exit(1);
            }
        });
}
