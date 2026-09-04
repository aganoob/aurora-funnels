---
name: shipflow-deployment
description: Configure and operate Shipflow Cloud Run environments, optional managed analytics delivery, secrets, domains, and releases.
---

# Shipflow Cloud Run Deployment

Use this skill for Shipflow hosting, domains, secrets, releases, or delivery-service configuration.

Each environment deploys a stateless Next.js funnel service on Cloud Run. Browser-only delivery keeps Meta Pixel and PostHog Web active. Confirmed server-side provider delivery uses an external service or the managed GCP delivery module.

Put this configuration in `shipflow.deploy.ts`.

```ts
import { defineDeploymentConfig } from "@aganoob/deployment";
import { gcpAnalyticsDelivery, gcpCloudRun } from "@aganoob/deployment-gcp-cloud-run";

export default defineDeploymentConfig({
  environments: {
    production: {
      target: gcpCloudRun({ projectId: "my-project", region: "europe-west1", service: "my-funnel" }),
      domains: { primary: "funnel.example.com", aliases: [] },
      analyticsDelivery: gcpAnalyticsDelivery({ contextTtlDays: 7 }),
    },
  },
});
```

Use `{ kind: "browser-only" }`, `{ kind: "external-service", url, hmacSecretName }`, or `gcpAnalyticsDelivery()`.

`browser-only` serves funnels, experiments, Stripe Checkout, Meta Pixel, and PostHog Web. It processes verified Stripe events within the funnel and delivers browser analytics. `external-service` sends versioned HMAC-authenticated requests to a user-operated service. `gcpAnalyticsDelivery()` adds a private Cloud Run delivery service, Firestore, encrypted payloads, and Cloud Tasks OIDC delivery.

```bash
pnpm shipflow deploy plan --environment production
pnpm shipflow deploy setup --environment production
pnpm shipflow deploy secrets set --environment production --name stripe-secret-key
pnpm shipflow deploy release --environment production
pnpm shipflow deploy doctor --environment production
```

The user supplies an existing billed GCP project and authenticated `gcloud`. Mutating commands display a plan and require confirmation. Use `--yes --non-interactive` for CI. Deployments begin on the Cloud Run URL; domain setup prints DNS instructions.

For the full operator runbook, delivery API contract, secret inventory, domain lifecycle, rollback behavior, and v2 migration procedure, read `docs/gcp-cloud-run.md` and `docs/migrating-v2-gcp.md`.

Keep build tokens and runtime credentials in Secret Manager. The generated manifest declares the required build variables, runtime variables, and secret suffixes. Release preflight loads `.env` and `.env.local`, checks each value is nonblank, and verifies that every required secret has an enabled `latest` version without reading its value. Register the production domain as a Stripe payment-method domain when wallets are enabled. Product backends consume Stripe directly. `SHIPFLOW_PRODUCT_WEBHOOK_URL` and `SHIPFLOW_PRODUCT_WEBHOOK_SECRET` enable the advisory signed Shipflow relay.

`shipflow deploy release` builds an immutable image, deploys zero-traffic tagged candidate revisions with startup probes, waits for revision readiness, checks the funnel candidate health URL, then promotes delivery followed by funnel traffic with explicit revision allocations. Existing traffic remains unchanged until all candidates are ready. A failed candidate is left tagged for inspection. Generated health routes validate `SHIPFLOW_RUNTIME_ROLE=funnel` or `delivery` and return only a generic public configuration error.

Run `shipflow migrate check` before an upgrade or deployment. It blocks legacy checkout, tracking, health, version, manifest, and domain drift while leaving customized files untouched and reporting concrete remediation. Run `pnpm validate`, `pnpm test`, `pnpm build`, and deployment doctor before handoff.
