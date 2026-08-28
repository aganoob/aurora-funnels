#!/usr/bin/env bash
set -euo pipefail
# Run validation and tests, then build linux/amd64 images with: docker buildx build --platform linux/amd64 --secret id=npm_token,env=NPM_TOKEN --push .
# Record the returned immutable digest in each environment image value before release.
