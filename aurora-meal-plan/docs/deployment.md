# Deployments

`main` releases to staging automatically. A GitHub production-environment approval then releases the same commit to production.

## One-time setup

Authenticate an administrator with Google Cloud and run the bootstrap script from this directory:

```bash
gcloud auth login
pnpm install --frozen-lockfile
./scripts/bootstrap-gcp-cicd.sh
```

The script creates the GitHub Workload Identity Federation provider, separate staging and production deployer service accounts, required Shipflow resources, and empty Secret Manager containers. It prints the repository and environment variables for GitHub.

Populate these Secret Manager values for each environment with `pnpm shipflow deploy secrets set --environment <environment> --name <name>`:

- `stripe-secret-key`
- `stripe-webhook-secret`
- `meta-capi-access-token`
- `posthog-project-api-key`

Create a repository Actions secret named `NPM_TOKEN` with a GitHub personal access token that has the `read:packages` scope. GitHub Actions refreshes each environment's `npm-token` Secret Manager value from this repository secret before Cloud Build begins.

Create separate Stripe test/live prices and webhook endpoints, Meta destinations, and PostHog projects. Set the following GitHub environment variables for both `staging` and `production`:

- `GCP_DEPLOY_SERVICE_ACCOUNT`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_META_DATASET_ID`
- `NEXT_PUBLIC_META_MODE`
- `SHIPFLOW_PUBLIC_URL`
- `STRIPE_PRICE_AURORA_MEAL_PLAN_ANNUAL`

Set `META_TEST_EVENT_CODE` for staging. Set these repository variables once:

- `GCP_PROJECT_ID=aurora-funnels`
- `GCP_REGION=europe-west2`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`, printed by the bootstrap script

## Production domain

After the first production release, run:

```bash
pnpm shipflow deploy domain setup --environment production --yes
```

Create the printed DNS A record for `aurora-meal.maratz.dev`. Run the command again after DNS propagates so Shipflow can activate the Cloud Run load-balancer route and verify HTTPS health.

## Operations

```bash
pnpm shipflow deploy doctor --environment staging
pnpm shipflow deploy doctor --environment production
pnpm shipflow deploy status --environment production --json
pnpm shipflow deploy rollback --environment production --yes
```
