#!/bin/bash

set -e  # Exit on error; debugging enabled.

# Get the root directory of repo
ROOT_DIR=$(git rev-parse --show-toplevel)
spec_location="${ROOT_DIR}/e2e_tests/gen/functions_openapi_spec.json"

show_help() {
    echo "Usage: $0 [--skip-gen-spec --spec spec_location]"
    echo "Import the OpenAPI spec into the sendblocks-cli project"
    echo ""
    echo "Options:"
    echo "  -h|--help: Show this help message"
    echo "  --skip-gen-spec: Skip generating the spec"
    echo "  --spec: The location of the OpenAPI spec to import"
    echo "  spec_location: The location of the OpenAPI spec to import"
}

skip_gen_spec=false
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -h|--help)
            show_help
            exit 0
            ;;
        --skip-gen-spec)
            skip_gen_spec=true
            shift
            ;;
        --spec)
            spec_location="$2"
            shift
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

if [ "$skip_gen_spec" = true ]; then
    echo "sendblocks-cli import: skipping generating the spec"
else
    pushd $ROOT_DIR
        ./gen_openapi_spec.sh
    popd
fi

# make sure we're running the script from its directory
cd "$(dirname "$0")"

echo "sendblocks-cli installing npm dependencies..."
npm ci

echo "sendblocks-cli importing spec from ${spec_location}..."
npx openapi-typescript "$spec_location" --output ./src/types/api.ts

npm run build
