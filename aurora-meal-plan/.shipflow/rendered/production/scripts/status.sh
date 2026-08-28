#!/usr/bin/env bash
set -euo pipefail
docker compose --env-file /etc/shipflow/production/production.env ps
