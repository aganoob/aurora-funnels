# Production deployment

The production deployment is declared in `shipflow.deploy.ts`. It runs a single Postgres-backed Shipflow environment on `aurora-meal-production` in `aurora-funnels/europe-west2-a`, serving `aurora-meal.maratz.dev`.

## Prepare the release

1. Copy `.shipflow/deploy/production.env.example` to `.shipflow/deploy/production.env` and populate its values. Keep this file at mode `0600` and omit `NPM_TOKEN`.
2. Run `pnpm deploy:check`. It validates the app, tests health configuration, builds the Next.js image, validates the deployment topology, and checks that the production environment has an immutable image digest and all required runtime values.
3. Build a separate `linux/amd64` image with `NEXT_PUBLIC_APP_URL`, PostHog, and Meta public values passed as Docker build arguments. Supply `NPM_TOKEN` only with `--secret id=npm_token,env=NPM_TOKEN`.
4. Push the image to Artifact Registry, record its immutable `@sha256:` digest in `PRODUCTION_IMAGE`, then rerun `pnpm deploy:preflight`.

## Provision and release

1. Render the current bundle with `pnpm deploy:render` and review `.shipflow/rendered/production`.
2. Before running the generated provision script, create an Artifact Registry repository, a dedicated VM service account with image-pull permissions, a static IP, IAP administration, and firewall rules allowing TCP 80 and 443.
3. Run `.shipflow/rendered/production/scripts/provision.sh`, copy the rendered bundle to `/opt/shipflow/production`, and install the root-owned environment file at `/etc/shipflow/production/production.env` with mode `0600`.
4. Create an A/AAAA DNS record for `aurora-meal.maratz.dev` pointing to the static IP. Caddy obtains and renews the TLS certificate after DNS propagation.
5. Run `cd /opt/shipflow/production && ./scripts/release.sh`, then confirm `https://aurora-meal.maratz.dev/api/health` returns `200` and the funnel, checkout, Stripe webhook, and analytics delivery work with production credentials.

## Operations

- Configure Stripe to deliver webhooks to `https://aurora-meal.maratz.dev/api/stripe/webhook`.
- Schedule a daily logical `pg_dump` backup before disk snapshots and retain seven days of backups.
- Keep the prior image digest. Restore it in the environment file and rerun `release.sh` when public health or checkout validation fails.
- Use the rendered `status.sh` and `logs.sh` scripts for incident response.

## Shipflow follow-up

`POSTHOG_PROJECT_API_KEY` is currently the same PostHog project ingestion key used by `NEXT_PUBLIC_POSTHOG_KEY`; its name implies a separate server secret. Shipflow should consolidate or rename this configuration with a backwards-compatible migration so deployments do not require the same value twice.
