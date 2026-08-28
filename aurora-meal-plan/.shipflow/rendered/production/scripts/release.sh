#!/usr/bin/env bash
set -euo pipefail
compose() { docker compose --env-file /etc/shipflow/production/production.env "$@"; }
compose pull
compose up -d --remove-orphans
compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
# Verify every public domain and restore the previous digest if a health check fails.
