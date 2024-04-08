import fs from 'fs';

import 'dotenv/config';
import prompts from 'prompts';
import { ensureSendBlocksCLIProject } from './project';

export async function loadToken() {
    // TODO - always refresh the token, and if it cannot be refreshed then prompt the user to login
    //        see https://app.clickup.com/t/86945t08u
    try {
        const token = fs.readFileSync('.auth', 'utf-8');
        if (token.length > 0) {
            return token;
        }
        throw new Error('Failed to load token from .auth file.');
    } catch (error) {
        console.error(`${error} Please login first:`);
        return await login();
    }
}

export async function login(): Promise<string> {
    ensureSendBlocksCLIProject();

    const AUTH_URL: string = process.env['AUTH_URL'] || "";
    if (AUTH_URL.length === 0) {
        console.error("Project environment has been corrupted, run 'sb-cli init' to reset.");
        process.exit(1);
    }
    console.log(`Authenticating with FrontEgg...`)

    const clientId = await prompts({
        type: 'text',
        name: 'value',
        message: 'Enter your FrontEgg Client ID',
    });

    const secret = await prompts({
        type: 'password',
        name: 'value',
        message: 'Enter your FrontEgg Secret',
    });

    if (!clientId.value || clientId.value.length === 0 ||
        !secret.value || secret.value.length === 0) {
        throw new Error('Client ID and Secret are required.');
    }

    // delete the .auth file
    try {
        fs.unlinkSync('.auth');
    } catch (error) {
        // ignore error
    }

    let token: string;
    const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
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
    token = data.accessToken;
    await fs.promises.writeFile('.auth', token);
    console.log('Successfully logged in! Bearer token stored in .auth file.');
    console.log(`Bearer token: ${token}\n\n`);
    return token;
};
