import prompts from 'prompts';

import * as functions from './functions';
import { listYamlFiles, mergeYamlFiles } from './sb-yaml';
import { generateStateChanges } from './state-diff';
import * as webhooks from './webhooks';

type StateComparisonResult = {
    webhooks: ResourceStateChanges,
    functions: ResourceStateChanges,
};


export async function deploy({previewOnly}: { previewOnly?: boolean} = {}) {
    // merge the yaml files into a single spec
    const spec = await mergeYamlFiles(listYamlFiles());

    const stateChanges = await generateStateChanges(spec);

    printStateChanges(stateChanges);

    if (previewOnly) {
        return;
    }

    if (stateChanges.webhooks.added.length === 0 && stateChanges.functions.added.length === 0 &&
        stateChanges.webhooks.changed.length === 0 && stateChanges.functions.changed.length === 0) {
        console.log('No changes to deploy');
        return;
    }

    // confirm changes with the user
    const confirm = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Please confirm that you have reviewed the changes and want to proceed with the deployment',
    });

    if (confirm.value) {
        // deploy the changes
        console.log('Deploying changes...\n');

        const webhookResults = await webhooks.deploy(stateChanges.webhooks);
        const functionResults = await functions.deploy(stateChanges.functions, webhookResults);

        console.log('\nDeployment complete!');

        console.log('\nWebhook deployment results:')
        console.table(webhookResults, ['webhook_name', 'webhook_id', 'deployed', 'skipped', 'response']);
        console.log('Function deployment results:')
        console.table(functionResults, ['function_name', 'webhook_id', 'deployed', 'skipped', 'response']);
    }
}

function printStateChanges(stateChanges: StateComparisonResult) {
    // print a table showing the differences between the states
    console.log('Webhooks:');
    if (stateChanges.webhooks.added.length > 0) {
        console.log(' - To be created:');
        console.table(stateChanges.webhooks.added, ['webhook_name', 'url']);
    }
    if (stateChanges.webhooks.changed.length > 0) {
        console.log(' - Changed:');
        console.table(stateChanges.webhooks.changed, ['webhook_name', 'url', 'webhook_id', 'changes']);
    }
    if (stateChanges.webhooks.unchanged.length > 0) {
        console.log(' - Unchanged:');
        console.table(stateChanges.webhooks.unchanged, ['webhook_name', 'url', 'webhook_id']);
    }
    if (stateChanges.webhooks.unreferenced.length > 0) {
        console.log(' - Unreferenced:');
        console.table(stateChanges.webhooks.unreferenced, ['webhook_name', 'url', 'webhook_id']);
    }
    console.log('Functions:');
    if (stateChanges.functions.added.length > 0) {
        console.log(' - To be created:');
        console.table(stateChanges.functions.added, ['function_name', 'chain_id', 'trigger_types', 'webhook', 'should_send_std_streams']);
    }
    if (stateChanges.functions.changed.length > 0) {
        console.log(' - Changed:');
        console.table(stateChanges.functions.changed, ['function_name', 'chain_id', 'webhook', 'should_send_std_streams', 'changes']);
    }
    if (stateChanges.functions.unchanged.length > 0) {
        console.log(' - Unchanged:');
        console.table(stateChanges.functions.unchanged, ['function_name', 'chain_id', 'trigger_types', 'webhook', 'should_send_std_streams']);
    }
    if (stateChanges.functions.unreferenced.length > 0) {
        console.log(' - Unreferenced:');
        console.table(stateChanges.functions.unreferenced, ['function_name', 'chain_id', 'trigger_types', 'webhook', 'should_send_std_streams']);
    }
}
