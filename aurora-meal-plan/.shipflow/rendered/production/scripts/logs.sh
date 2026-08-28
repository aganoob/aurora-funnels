#!/usr/bin/env bash
set -euo pipefail
docker compose --env-file /etc/shipflow/production/production.env logs --tail=200 -f "$@"
