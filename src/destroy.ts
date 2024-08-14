import prompts from 'prompts';

import * as functions from './functions';
import { listYamlFiles, mergeYamlFiles } from './sb-yaml';
import { generateStateChanges } from './state-diff';
import * as webhooks from './webhooks';

type StateComparisonResult = {
    webhooks: ResourceStateChanges,
    functions: ResourceStateChanges,
};


// destroy --dry-run
export async function destroy({dryRun, nonInteractive}: { dryRun?: boolean, nonInteractive?: boolean} = {}) {
    // merge the yaml files into a single spec
    const spec = await mergeYamlFiles(listYamlFiles());

    const stateChanges = await generateStateChanges(spec);

    printStateChanges(stateChanges);

    if (dryRun) {
        console.log('Dry-run complete! No resources were destroyed.');
        return;
    }

    if (stateChanges.webhooks.changed.length === 0 && stateChanges.webhooks.unchanged.length === 0 &&
        stateChanges.functions.changed.length === 0 && stateChanges.functions.unchanged.length === 0) {
        console.log('No resources to destroy');
        return;
    }

    let confirm;
    if (!nonInteractive) {
        // confirm changes with the user
        confirm = await prompts({
            type: 'confirm',
            name: 'value',
            message: 'Please confirm that you have reviewed the changes and want to proceed with destroying the resources',
        });
    }

    if (nonInteractive || confirm?.value) {
        // deploy the changes
        console.log('Deploying changes...\n');

        const functionResults = await functions.destroy(stateChanges.functions);
        const webhookResults = await webhooks.destroy(stateChanges.webhooks, functionResults);

        console.log('\nDeployment complete!');

        console.log('Function deployment results:')
        console.table(functionResults, ['function_name', 'destroyed', 'skipped', 'response']);
        console.log('\nWebhook deployment results:')
        console.table(webhookResults, ['webhook_name', 'destroyed', 'skipped', 'response']);
    }
}

function printStateChanges(stateChanges: StateComparisonResult) {
    // print a table showing the differences between the states
    console.log('Webhooks:');
    const combinedWebhookChanges = [...stateChanges.webhooks.changed, ...stateChanges.webhooks.unchanged];
    if (combinedWebhookChanges.length > 0) {
        console.log(' - To be destroyed:');
        console.table(combinedWebhookChanges, ['webhook_name', 'url', 'webhook_id']);
    }
    if (stateChanges.webhooks.unreferenced.length > 0) {
        console.log(' - Unreferenced:');
        console.table(stateChanges.webhooks.unreferenced, ['webhook_name', 'url', 'webhook_id']);
    }
    console.log('Functions:');
    const combinedFunctionChanges = [...stateChanges.functions.changed, ...stateChanges.functions.unchanged];
    if (combinedFunctionChanges.length > 0) {
        console.log(' - To be destroyed:');
        console.table(combinedFunctionChanges, ['function_name', 'function_id', 'chain_id', 'webhook']);
    }
    if (stateChanges.functions.unreferenced.length > 0) {
        console.log(' - Unreferenced:');
        console.table(stateChanges.functions.unreferenced, ['function_name', 'function_id', 'chain_id', 'trigger_types', 'webhook']);
    }
}
