#!/usr/bin/env bash
set -euo pipefail
# Schedule daily pg_dump backups before disk snapshots; retain seven daily backups.
