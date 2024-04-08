# SendBlocks CLI

A CLI tool for interacting with the SendBlocks platform.

## Installation

```shell
npm install sendblocks-cli
```

Run `sb-cli -h` for usage.

## Authentication

In order to interact with the SendBlocks API, you will require a client ID and secret. Sign in using `sb-cli login`, the token will be stored in `.auth`.

If your token has expired, simply run `sb-cli login` again.
