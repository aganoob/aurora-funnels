# Deployments

`main` releases to staging automatically. You can also open **Actions → Deploy Aurora meal plan → Run workflow**, select any workflow branch, and optionally enter a branch, tag, or commit SHA in `source_ref` to deploy that exact revision to staging. Production runs only from an automatic `main` push: it follows a successful staging release and waits for the GitHub production-environment approval.

## Release flow

```text
Pull request → CI (types, tests, build) → merge to main
  → staging release → production-environment approval → production release
```

The deployment workflow validates the source, builds an image in Cloud Build, deploys it to the environment's Cloud Run service, and runs Shipflow's deployment doctor. Staging and production use independent Cloud Run services and Secret Manager values.

| Environment | Cloud Run service | Custom domain |
| --- | --- | --- |
| Staging | `aurora-meal-staging` | `preview-begin.aurorafirst.ai` |
| Production | `aurora-meal-production` | `begin.aurorafirst.ai` |

Use the production-environment approval as the release gate. A successful staging release is required before the production job can run.

## GitHub Actions access to Google Cloud

GitHub authenticates to Google Cloud with Workload Identity Federation. No long-lived GCP key is stored in GitHub.

The pool `github-actions` and provider `aurora-funnels` accept OIDC tokens only from this repository's `main` branch. The provider also requires the workflow's matching GitHub environment:

| GitHub environment | GCP deployer service account | Scope |
| --- | --- | --- |
| `staging` | `github-staging-deployer@aurora-funnels.iam.gserviceaccount.com` | Cloud Build, the staging build/runtime identities, the staging npm-token secret, and `aurora-meal-staging` |
| `production` | `github-production-deployer@aurora-funnels.iam.gserviceaccount.com` | Cloud Build, the production build/runtime identities, the production npm-token secret, and `aurora-meal-production` |

Each deployer has Cloud Run admin access conditioned on its single service. This preserves the production approval gate and prevents staging jobs from deploying production.

The workflow installs pnpm before `actions/setup-node` restores the pnpm cache. Keep that ordering whenever the workflow changes.

### GCP access: zero-to-hero checklist

`scripts/bootstrap-gcp-cicd.sh` is the source of truth for the deployment access model. Run it again after changing this section; it is idempotent and reconciles the GitHub deployment identities, secrets, and Cloud Build source bucket.

| Principal or resource | Required access | Scope and purpose |
| --- | --- | --- |
| Bootstrap operator | Project Owner, or an equivalent administrator role set | Creates APIs, Workload Identity resources, service accounts, secrets, Artifact Registry, Cloud Run resources, and bucket policies. |
| Enabled APIs | Cloud Run, Cloud Build, Artifact Registry, Secret Manager, IAM Credentials, Logging, Compute | Required by `shipflow deploy setup`; Compute supports the configured custom domains. |
| GitHub OIDC provider | Attribute mapping for repository ID, owner ID, branch, and GitHub environment | The provider accepts only this repository’s `main` branch with the `staging` or `production` environment. |
| GitHub staging/production OIDC principal | `roles/iam.workloadIdentityUser` on its matching deployer service account | Allows the GitHub environment to impersonate only its matching deployer. |
| `github-<environment>-deployer` | `roles/cloudbuild.builds.editor`, `roles/serviceusage.serviceUsageConsumer` | Creates builds and consumes enabled Google APIs. |
| `github-<environment>-deployer` | `roles/run.admin`, conditioned on its one Cloud Run service | Deploys staging only to `aurora-meal-staging` and production only to `aurora-meal-production`. |
| `github-<environment>-deployer` | `roles/iam.serviceAccountUser` on its build and runtime accounts | Allows a release to select the dedicated Cloud Build and Cloud Run runtime identities. |
| Build service account | `roles/artifactregistry.writer`, `roles/logging.logWriter`, `roles/secretmanager.secretAccessor` | Pushes the container, writes build logs, and reads its environment’s npm token. |
| Runtime service account | `roles/secretmanager.secretAccessor` | Reads its environment’s Stripe, Meta, and PostHog runtime secrets. |
| Deployer on `shipflow-<environment>-npm-token` | `roles/secretmanager.secretVersionAdder` | Refreshes the GitHub Packages token before each build. |
| Build account on `shipflow-<environment>-npm-token` | `roles/secretmanager.secretAccessor` | Exposes the token to Cloud Build’s npm install only. |
| `aurora-funnels_cloudbuild` source bucket | Deployer: `roles/storage.bucketViewer` and `roles/storage.objectUser`; build account: `roles/storage.objectViewer` | Uploads and fetches the archived build source. The bootstrap creates this `US` bucket if it is absent. |
| Legacy source-bucket ACL, when uniform bucket-level access is disabled | Deployer: bucket ACL `WRITER` | Supports Cloud Build source uploads for the legacy default source bucket. The bootstrap checks the bucket mode and applies this only when ACLs are enabled. |

The Cloud Build service agent remains project-managed through `roles/cloudbuild.serviceAgent`. A same-project custom build identity does not need an additional service-account token-creator binding. Cross-project custom build identities do require `roles/iam.serviceAccountTokenCreator` for the Cloud Build service agent in the identity’s project.

### Required GitHub configuration

Set the repository variables `GCP_PROJECT_ID`, `GCP_REGION`, and `GCP_WORKLOAD_IDENTITY_PROVIDER`. In each GitHub environment, set `GCP_DEPLOY_SERVICE_ACCOUNT` to its matching `github-<environment>-deployer@aurora-funnels.iam.gserviceaccount.com`, plus the public runtime variables listed below. Keep `NPM_TOKEN` as a repository Actions secret with `read:packages`.

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

> **Temporary production bootstrap:** the initial production release may use the current staging credentials. Before enabling live payments or production analytics, replace every `shipflow-production-*` secret and production environment variable with production-specific Stripe, Meta, and PostHog credentials, then release production again.

Set `META_TEST_EVENT_CODE` for staging. Set these repository variables once:

- `GCP_PROJECT_ID=aurora-funnels`
- `GCP_REGION=europe-west1`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`, printed by the bootstrap script

## Cloud Run URLs while domains are pending

The first release of each environment is available on its default Cloud Run URL; custom-domain setup can wait. For this project, use these temporary URLs in the matching GitHub environment variables:

| Environment | `NEXT_PUBLIC_APP_URL` and `SHIPFLOW_PUBLIC_URL` |
| --- | --- |
| `staging` | `https://aurora-meal-staging-kbysqzdoca-ew.a.run.app` |
| `production` | Read the value reported by `gcloud run services describe` after its first release. |

Set `NEXT_PUBLIC_APP_URL` before the release because it is embedded in the browser build and used as the Stripe Checkout success and cancellation origin. Set `SHIPFLOW_PUBLIC_URL` to the same value for the runtime configuration. Cloud Run generates the hostname, so use the existing staging URL above and retrieve the production URL after its initial release:

```bash
gcloud run services describe aurora-meal-staging --project aurora-funnels --region europe-west1 --format='value(status.url)'
gcloud run services describe aurora-meal-production --project aurora-funnels --region europe-west1 --format='value(status.url)'
```

Create or update the Stripe webhook endpoint for each environment to `<Cloud Run URL>/api/stripe/webhook`, then store that endpoint's signing secret in the corresponding `stripe-webhook-secret` Secret Manager value. Keep the staging Stripe test-mode endpoint separate from the production live-mode endpoint.

When the custom domains are available, replace both GitHub environment variables and the Stripe webhook endpoint URL with the matching domain, then release each environment again.

## Routine operations

### Release an exact revision to staging

Use **Actions → Deploy Aurora meal plan → Run workflow**. Select the workflow branch and set `source_ref` to a branch, tag, or commit SHA when needed. The production job runs only for a `main` push after staging succeeds.

### Verify a release

```bash
pnpm shipflow deploy doctor --environment staging
pnpm shipflow deploy doctor --environment production
pnpm shipflow deploy status --environment production --json
```

Check the service health endpoint at `<service URL>/api/health`. After a custom-domain certificate becomes ready, also check `https://preview-begin.aurorafirst.ai/api/health` and `https://begin.aurorafirst.ai/api/health`.

### Roll back production

```bash
pnpm shipflow deploy rollback --environment production --yes
```

Shipflow moves all production traffic to the newest ready revision that is outside the active traffic set. Confirm the selected revision and health endpoint after rollback.

## Troubleshooting

| Symptom | Check | Resolution |
| --- | --- | --- |
| `Unable to locate executable file: pnpm` | Deployment workflow order | Run `pnpm/action-setup` before `actions/setup-node` when the Node action caches pnpm. |
| `invalid_target` from `google-github-actions/auth` | `GCP_WORKLOAD_IDENTITY_PROVIDER` and the `github-actions` pool/provider | Ensure the provider exists, its repository/branch/environment conditions match the workflow, and the matching deployer account has `roles/iam.workloadIdentityUser`. |
| `gcloud builds submit` cannot access its source-staging bucket | `aurora-funnels_cloudbuild` bucket IAM and ACL | Re-run `./scripts/bootstrap-gcp-cicd.sh`. It creates the bucket when absent, grants each deployer `roles/storage.bucketViewer` and `roles/storage.objectUser`, plus `roles/storage.objectViewer` to its build account. Buckets that still use legacy ACLs also grant each deployer `WRITER`. |
| Custom domain remains pending | `gcloud beta run domain-mappings describe` | Create the returned DNS record and wait for Google-managed certificate issuance. |

## Custom domains

Map each Cloud Run service directly to its hostname:

```bash
gcloud beta run domain-mappings create --service aurora-meal-staging --domain preview-begin.aurorafirst.ai --region europe-west1 --project aurora-funnels
gcloud beta run domain-mappings create --service aurora-meal-production --domain begin.aurorafirst.ai --region europe-west1 --project aurora-funnels
```

Create these CNAME records at the domain's DNS provider:

| Host | Target |
| --- | --- |
| `preview-begin` | `ghs.googlehosted.com.` |
| `begin` | `ghs.googlehosted.com.` |

Cloud Run provisions and renews the TLS certificates after DNS propagates. Inspect a mapping and its certificate state with `gcloud beta run domain-mappings describe --domain <domain> --region europe-west1 --project aurora-funnels`.

## Regional cutover follow-up

- [ ] After the `europe-west1` staging deployment, checkout flow, and domain routing are verified, decommission the legacy `europe-west2` Cloud Run service and its regional Artifact Registry images.

## Operations

```bash
pnpm shipflow deploy doctor --environment staging
pnpm shipflow deploy doctor --environment production
pnpm shipflow deploy status --environment production --json
pnpm shipflow deploy rollback --environment production --yes
```
