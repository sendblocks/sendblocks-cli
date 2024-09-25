import fs from "fs";

import prompts from "prompts";
import { authUrl, ensureSendBlocksConfigured } from "./config";

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

export async function login(): Promise<string> {
    ensureSendBlocksConfigured();

    if (authUrl.length === 0) {
        console.error("Project environment has been corrupted, run 'sb-cli init' to reset.");
        process.exit(1);
    }

    const clientId = await prompts({
        type: "text",
        name: "value",
        message: "Enter your SendBlocks Client ID",
    });

    if (!clientId.value || clientId.value.length === 0) {
        throw new Error("Client ID is required.");
    }

    const secret = await prompts({
        type: "password",
        name: "value",
        message: "Enter your SendBlocks Secret",
    });

    if (!secret.value || secret.value.length === 0) {
        throw new Error("Secret is required.");
    }

    // delete the .auth file
    try {
        fs.unlinkSync(".auth");
    } catch (error) {
        // ignore error
    }

    const response = await fetch(authUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            clientId: clientId.value,
            secret: secret.value,
        }),
    });
    if (!response.ok) {
        throw new Error(`Failed to login, received status code ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    let token = data.accessToken;
    await fs.promises.writeFile(".auth", token);
    console.log("Successfully logged in! Bearer token stored in .auth file.");
    console.log(`Bearer token: ${token}\n\n`);
    return token;
}
