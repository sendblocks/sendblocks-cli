import fs from 'fs';
import path from 'path';

const CONFIG_FILE = "sendblocks.config.json";

export function ensureSendBlocksConfigured(options: { projectPath?: string } = {}): void {
    const projectPath: string = options.projectPath || path.resolve(process.cwd());
    const sendblocksFile = path.resolve(projectPath, CONFIG_FILE);
    if (!fs.existsSync(sendblocksFile)) {
        console.error('Please initialize the project before logging in.');
        process.exit(1);
    }
}

let configurationJson: {
    authUrl: string,
    apiUrl: string,
} = {
    authUrl: "",
    apiUrl: "",
};

try {
    configurationJson = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
} catch (error) {
    // ignore this error here, we'll handle it where necessary
}

export const authUrl: string = configurationJson.authUrl;

export const apiUrl: string = configurationJson.apiUrl;
