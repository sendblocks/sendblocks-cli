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

Use the `init` command to initialize the project, this will configure your folder (or a folder you've provided as an argument) for use with the `sendblocks-cli` tool as well as initialize it with a sample `functions.yaml` configuration which will deploy an echo function.

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

If you have your credentials, sign in using `sb-cli login` and the token will be stored in the `.auth` of your project's root folder as well as printed to your console.

```shell
$ sb-cli login
✔ Enter your SendBlocks Client ID … 12ab3456-abab-1a23-a123-abcdef123456
✔ Enter your SendBlocks Secret … ************************************
Successfully logged in! Bearer token stored in .auth file.
Bearer token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjFmNjQ4NmJMIn0....
```

Once you have successfully logged in, you will be able to refresh your authentication token with `sb-cli login --refresh`.

If your refresh token has expired, simply run `sb-cli login` again.

## Webhooks

For more details on constructing valid webhooks, see [Create Webhook](https://docs.sendblocks.io/reference/create_webhook_api_v1_webhooks_post) in our API reference.

## Functions

For more details on constructing valid functions, see [Create Function](https://docs.sendblocks.io/reference/create_function_api_v1_functions_post) in our API reference.

### Single file functions

When a function is contained within a single file, use the `code` field, and it will be uploaded as-is and editable directly via the UI.

### Multi-file functions

When a function's code is spread over multiple files and folders, use the `source` field to point to the function's root folder. A valid source folder must include exactly one entrypoint, either `main.ts` or `main.js`, and the entrypoint must include exactly one function handler called `triggerHandler`.

As there are limitations to the size of the bundled files that can be uploaded, if any component of your code needs to be generated then it is recommended to keep your source and distribution code separate.

## Sample Resources

After initializing your project, you will find a `src/samples.yaml` resource definition file along with a `samples` folder.

The sample resource definition file includes a function and its webhook. It is worth noting that the `sendblocks-cli` tool identifies functions and webhooks by name, in contrast to the [SendBlocks API](https://sendblocks.readme.io/reference/) which relies exclusively on function and webhook UUIDs.

```yaml
---

webhooks:
  - echo_function_webhook:
      url: https://your.webhook.url.here
      secret: "auth secret"

functions:
  - echo_function:
      chain_id: CHAIN_ETH_SEPOLIA
      code: samples/echo/echo_function.ts
      is_enabled: true
      should_send_std_streams: true
      triggers:
        - type: TRIGGER_TYPE_ADDRESS
          address: "0x1234567890abcdef1234567890abcdef12345678"
          locations:
            - trace_from
      webhook: echo_function_webhook

```

### Echo Function

The `echo_function` sample points to `samples/echo/echo_function.ts`, which is a simple function defined in a single file that simply relays its `context` and `data` objects to its webhook.

```typescript
export function triggerHandler(context: any, data: any) {
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
┌─────────┬─────────────────┬─────────────────────┬────────────────────────┬────────────────┬────────────┬─────────────────────────┐
│ (index) │ function_name   │ chain_id            │ trigger_types          │ webhook        │ is_enabled │ should_send_std_streams │
├─────────┼─────────────────┼─────────────────────┼────────────────────────┼────────────────┼────────────┼─────────────────────────┤
│ 0       │ 'function_name' │ 'CHAIN_ETH_SEPOLIA' │ 'TRIGGER_TYPE_ADDRESS' │ 'webhook_name' │ true       │ true                    │
└─────────┴─────────────────┴─────────────────────┴────────────────────────┴────────────────┴────────────┴─────────────────────────┘
 - Unreferenced:
┌─────────┬──────────────────────────┬────────────────────────────────────────┬─────────────────────┬────────────────────────┬─────────────────────────┬────────────┬─────────────────────────┐
│ (index) │ function_name            │ function_id                            │ chain_id            │ trigger_types          │ webhook                 │ is_enabled │ should_send_std_streams │
├─────────┼──────────────────────────┼────────────────────────────────────────┼─────────────────────┼────────────────────────┼─────────────────────────┼────────────┼─────────────────────────┤
│ 0       │ 'existing_function_name' │ 'ae27803b-fb54-4edd-a458-285d6c2a843b' │ 'CHAIN_ETH_SEPOLIA' │ 'TRIGGER_TYPE_ADDRESS' │ 'existing_webhook_name' │ true       │ true                    │
└─────────┴──────────────────────────┴────────────────────────────────────────┴─────────────────────┴────────────────────────┴─────────────────────────┴────────────┴─────────────────────────┘
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

## Replay Blocks for Deployed Functions

In order to backfill your subgraphs (or to trigger your functions for specific blocks for any other reason), you can use the `sb-cli functions replay-blocks` command.

The required arguments are `--start <start_block_number>` and `--end <end_block_number>`.

To specify functions to be triggered, provide a comma-separated list of function names with the `--functions` argument.

If no function names are provided, all deployed functions that are referenced in the YAML spec will be triggered (where relevant, assuming that the blocks are valid blocks for the functions' chains and that the blocks in the given range match the functions' triggers).

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
