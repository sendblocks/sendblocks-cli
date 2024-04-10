# SendBlocks CLI

A CLI tool for interacting with the SendBlocks platform.

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

**NOTE**: For direct execution using `npx`, wherever the usage says `sb-cli`, use `sendblocks-cli` instead.

For usage instructions:

```shell
npx sendblocks-cli -h
```

## Authentication

In order to interact with the SendBlocks API, you will require a client ID and secret.
Sign in using `sb-cli login`, the token will be stored in `.auth`.

If your token has expired, simply run `sb-cli login` again.
