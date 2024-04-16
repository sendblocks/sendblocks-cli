# SendBlocks CLI

A CLI tool for interacting with the SendBlocks platform.

See our [developer documentation](https://sendblocks.readme.io/docs) for a more in-depth introduction.

## Installation

### Global installation

```shell
npm install --global sendblocks-cli
```

For usage instructions:

```shell
sb-cli -h
```

### Direct execution

**NOTE**: For direct execution using `npx`, wherever the usage (or this documentation) says `sb-cli`, use `sendblocks-cli` instead.

For usage instructions:

```shell
npx sendblocks-cli -h
```

## Project Initialization

Use the `init` command to initialize the project, this will configure your folder (or a given folder) for use with the `sendblocks-cli` tool as well as initialize it with a sample `functions.yaml` configuration which will deploy an echo function.

**IMPORTANT NOTE**: If you're trying to initialize a project that's already got files in it, ensure that the files listed are safe before proceeding!

```shell
$ sb-cli init
Initializing project at /workspaces/test ...

Folder is not empty! Force initialization?
The following files will be modified / overwritten:
        /workspaces/my_project/.gitignore,
        ...

? Are you sure you want to continue with the project initialization? › (y/N)
```

## Authentication

Once your project has been initialized, you will be able to sign in to the SendBlocks API.
For this you will require a client ID and secret, if you don't already have them then [please get in touch with us](https://sendblocks.io/#getstarted)!

If you have your credentials, sign in using `sb-cli login` and the token will be stored in `.auth` and printed to your console.

```shell
$ sb-cli login
✔ Enter your SendBlocks Client ID … 12ab3456-abab-1a23-a123-abcdef123456
✔ Enter your SendBlocks Secret … ************************************
Successfully logged in! Bearer token stored in .auth file.
Bearer token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjFmNjQ4NmJMIn0....

```

If your token has expired, simply run `sb-cli login` again.

## Sample Resources

After initializing your project, you will find a `src/functions.yaml` resource definition file along with `functions/echo_function.ts` sample function.

The sample resource definition file includes a function and its webhook, which the `sendblocks-cli` tool will identify by their names (as opposed to using the [SendBlocks API](https://sendblocks.readme.io/reference/getting-an-access-token) directly, which relies solely on function and webhook UUIDs).

```yaml
---

webhooks:
  - webhook_name:
      url: https://example.com
      secret: "auth secret"

functions:
  - function_name:
      chain_id: CHAIN_ETH_SEPOLIA
      code: functions/echo_function.ts
      should_send_std_streams: true
      triggers:
        - type: TRIGGER_TYPE_ADDRESS
          address: "0x1234567890abcdef1234567890abcdef12345678"
          locations:
            - log_emitter
      webhook: webhook_name

```

The sample `function` resource points to `functions/echo_function.ts`, which is a simple echo function:

```typescript
export function triggerHandler(context, data) {
    return { context: context, data: data };
}
```

## Deploying Resources

To deploy your changes, run `sb-cli deploy`. This will process all of the `yaml` files in the `src` folder and display a preview of the changes, requiring confirmation prior to deploying.

```shell
$ sb-cli deploy
Found 1 yaml files in src folder
 - functions.yaml
Comparing state...
Webhooks:
 - To be created:
┌─────────┬────────────────┬───────────────────────┐
│ (index) │ webhook_name   │ url                   │
├─────────┼────────────────┼───────────────────────┤
│ 0       │ 'webhook_name' │ 'https://example.com' │
└─────────┴────────────────┴───────────────────────┘
 - Unreferenced:
┌─────────┬─────────────────────────┬───────────────────────┬────────────────────────────────────────┐
│ (index) │ webhook_name            │ url                   │ webhook_id                             │
├─────────┼─────────────────────────┼───────────────────────┼────────────────────────────────────────┤
│ 0       │ 'existing_webhook_name' │ 'https://example.com' │ '9fc309b6-7ac2-4a1d-86a2-5b60d6b0795d' │
└─────────┴─────────────────────────┴───────────────────────┴────────────────────────────────────────┘
Functions:
 - To be created:
┌─────────┬─────────────────┬─────────────────────┬────────────────────────┬────────────────┬─────────────────────────┐
│ (index) │ function_name   │ chain_id            │ trigger_types          │ webhook        │ should_send_std_streams │
├─────────┼─────────────────┼─────────────────────┼────────────────────────┼────────────────┼─────────────────────────┤
│ 0       │ 'function_name' │ 'CHAIN_ETH_SEPOLIA' │ 'TRIGGER_TYPE_ADDRESS' │ 'webhook_name' │ true                    │
└─────────┴─────────────────┴─────────────────────┴────────────────────────┴────────────────┴─────────────────────────┘
 - Unreferenced:
┌─────────┬──────────────────────────┬────────────────────────────────────────┬─────────────────────┬────────────────────────┬─────────────────────────┬─────────────────────────┐
│ (index) │ function_name            │ function_id                            │ chain_id            │ trigger_types          │ webhook                 │ should_send_std_streams │
├─────────┼──────────────────────────┼────────────────────────────────────────┼─────────────────────┼────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 0       │ 'existing_function_name' │ 'ae27803b-fb54-4edd-a458-285d6c2a843b' │ 'CHAIN_ETH_SEPOLIA' │ 'TRIGGER_TYPE_ADDRESS' │ 'existing_webhook_name' │ true                    │
└─────────┴──────────────────────────┴────────────────────────────────────────┴─────────────────────┴────────────────────────┴─────────────────────────┴─────────────────────────┘
? Please confirm that you have reviewed the changes and want to proceed with the deployment › (y/N)
```

To preview your changes only, run `sb-cli preview`.

Once confirmed, the changes will be deployed and results will be printed.

```shell
✔ Please confirm that you have reviewed the changes and want to proceed with the deployment … yes
Deploying changes...

Creating webhook webhook_name...
Creating function function_name...

Deployment complete!

Webhook deployment results:
┌─────────┬─────────────────────────┬────────────────────────────────────────┬──────────┬─────────┬──────────┐
│ (index) │ webhook_name            │ webhook_id                             │ deployed │ skipped │ response │
├─────────┼─────────────────────────┼────────────────────────────────────────┼──────────┼─────────┼──────────┤
│ 0       │ 'webhook_name'          │ '726cc7c7-0486-4c63-864f-5b5febe59e43' │ true     │         │          │
│ 1       │ 'existing_webhook_name' │ '9fc309b6-7ac2-4a1d-86a2-5b60d6b0795d' │          │ true    │          │
└─────────┴─────────────────────────┴────────────────────────────────────────┴──────────┴─────────┴──────────┘
Function deployment results:
┌─────────┬──────────────────────────┬────────────────────────────────────────┬──────────┬─────────┬──────────┐
│ (index) │ function_name            │ function_id                            │ deployed │ skipped │ response │
├─────────┼──────────────────────────┼────────────────────────────────────────┼──────────┼─────────┼──────────┤
│ 0       │ 'function_name'          │ '75789776-d1f0-41b3-bf22-3c0e088b83d8' │ true     │         │          │
│ 1       │ 'existing_function_name' │ 'ae27803b-fb54-4edd-a458-285d6c2a843b' │          │ true    │          │
└─────────┴──────────────────────────┴────────────────────────────────────────┴──────────┴─────────┴──────────┘
```

## Resource Destruction

To destroy the resources described by your `yaml` files, run `sb-cli destroy`. This will not affect any resources that are not named in your resource definitions.

```shell
$ sb-cli destroy
Found 1 yaml files in src folder
 - functions.yaml
Comparing state...
Webhooks:
 - To be destroyed:
┌─────────┬────────────────┬───────────────────────┬────────────────────────────────────────┐
│ (index) │ webhook_name   │ url                   │ webhook_id                             │
├─────────┼────────────────┼───────────────────────┼────────────────────────────────────────┤
│ 0       │ 'webhook_name' │ 'https://example.com' │ '726cc7c7-0486-4c63-864f-5b5febe59e43' │
└─────────┴────────────────┴───────────────────────┴────────────────────────────────────────┘
 - Unreferenced:
┌─────────┬─────────────────────────┬───────────────────────┬────────────────────────────────────────┐
│ (index) │ webhook_name            │ url                   │ webhook_id                             │
├─────────┼─────────────────────────┼───────────────────────┼────────────────────────────────────────┤
│ 0       │ 'existing_webhook_name' │ 'https://example.com' │ '9fc309b6-7ac2-4a1d-86a2-5b60d6b0795d' │
└─────────┴─────────────────────────┴───────────────────────┴────────────────────────────────────────┘
Functions:
 - To be destroyed:
┌─────────┬─────────────────┬────────────────────────────────────────┬─────────────────────┬────────────────┐
│ (index) │ function_name   │ function_id                            │ chain_id            │ webhook        │
├─────────┼─────────────────┼────────────────────────────────────────┼─────────────────────┼────────────────┤
│ 0       │ 'function_name' │ '75789776-d1f0-41b3-bf22-3c0e088b83d8' │ 'CHAIN_ETH_SEPOLIA' │ 'webhook_name' │
└─────────┴─────────────────┴────────────────────────────────────────┴─────────────────────┴────────────────┘
 - Unreferenced:
┌─────────┬──────────────────────────┬────────────────────────────────────────┬─────────────────────┬────────────────────────┬─────────────────────────┐
│ (index) │ function_name            │ function_id                            │ chain_id            │ trigger_types          │ webhook                 │
├─────────┼──────────────────────────┼────────────────────────────────────────┼─────────────────────┼────────────────────────┼─────────────────────────┤
│ 0       │ 'existing_function_name' │ 'ae27803b-fb54-4edd-a458-285d6c2a843b' │ 'CHAIN_ETH_SEPOLIA' │ 'TRIGGER_TYPE_ADDRESS' │ 'existing_webhook_name' │
└─────────┴──────────────────────────┴────────────────────────────────────────┴─────────────────────┴────────────────────────┴─────────────────────────┘
? Please confirm that you have reviewed the changes and want to proceed with destroying the resources › (y/N)
```

Upon confirmation, the resources will be deleted and the results will be printed.

```shell
✔ Please confirm that you have reviewed the changes and want to proceed with destroying the resources … yes
Deploying changes...

Deleting function function_name...
Deleting webhook webhook_name...

Deployment complete!
Function deployment results:
┌─────────┬─────────────────┬───────────┬─────────┬──────────┐
│ (index) │ function_name   │ destroyed │ skipped │ response │
├─────────┼─────────────────┼───────────┼─────────┼──────────┤
│ 0       │ 'function_name' │ true      │         │          │
└─────────┴─────────────────┴───────────┴─────────┴──────────┘

Webhook deployment results:
┌─────────┬────────────────┬───────────┬─────────┬──────────┐
│ (index) │ webhook_name   │ destroyed │ skipped │ response │
├─────────┼────────────────┼───────────┼─────────┼──────────┤
│ 0       │ 'webhook_name' │ true      │         │          │
└─────────┴────────────────┴───────────┴─────────┴──────────┘
```

To simply review the resources that will be destroyed, use `sb-cli destroy --dry-run`.
