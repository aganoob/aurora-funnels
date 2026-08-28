---
name: shipflow-deployment
description: Configure, validate, and render Shipflow application deployments, including GCP VM bundles, Caddy routing, runtime secrets, and release operations.
---

# Shipflow Deployment

Use this skill when a Shipflow application needs hosting configuration, a deployment plan or rendered bundle, Caddy/domain changes, runtime delivery configuration, or an operational deployment review. Funnel UI work belongs in the Funnel Builder skill.

## Outcome

Keep deployment configuration declarative, reviewable, and separate from the application runtime. `shipflow.deploy.ts` describes hosts and environments. The CLI validates and renders a bundle; people run cloud provisioning and release scripts explicitly.

## Discover before changing deployment

Read these files before editing:

1. `shipflow.deploy.ts` for host, domain, delivery, image, and resource configuration.
2. `shipflow.config.ts`, `lib/products.ts`, and funnel domains for application routing consistency.
3. `.shipflow/manifest.json` for applied migrations.
4. `compose.yaml` and `Caddyfile` for the local container boundary.

Keep every deployed domain consistent across the deployment environment, product definition, funnel definition, and `NEXT_PUBLIC_APP_URL`. Use one Shipflow application environment for related funnels and domains.

## Configure environments

Define deployment separately from runtime configuration:

```ts
import { defineDeploymentConfig } from "@aganoob/deployment";
import { gcpVm } from "@aganoob/deployment-gcp-vm";

export default defineDeploymentConfig({
  hosts: {
    production: gcpVm({
      projectId: "my-project",
      zone: "europe-west1-b",
      name: "shipflow-production",
      machineType: "auto",
    }),
  },
  environments: {
    production: {
      host: "production",
      domains: { primary: "funnel.example.com", aliases: [] },
      delivery: { mode: "postgres" },
    },
  },
});
```

Use `backend` when a product owns durable server delivery. Use `postgres` for a standalone Shipflow application that needs the included worker, migrations, encrypted conversion context, backup, and attached data disk.

Hosts may contain several environments. They remain isolated Compose services behind a shared Caddy instance. Separate hosts provide the default production isolation.

## Plan before applying

Use the CLI to create and inspect artifacts:

```bash
pnpm shipflow deploy env init --environment production
# Replace PRODUCTION_IMAGE in .shipflow/deploy/production.env with the published immutable digest.
pnpm shipflow deploy doctor --environment production
pnpm shipflow deploy plan --environment production --json
pnpm shipflow deploy render --host production --out .shipflow/rendered/production
```

Review diagnostics before rendering or running scripts. The GCP VM adapter selects `e2-small` for one backend environment, `e2-medium` for one Postgres or two backend environments, and `e2-standard-2` when a Postgres environment shares its host. It reserves 25% memory headroom. Set explicit machine, disk, or container limits only with an understood workload reason.

## Security and release boundaries

- Keep runtime files in `.shipflow/deploy/*.env`, ignored by Git and mode `0600`. `env init` generates Postgres and delivery secrets; provider credentials remain required values.
- Runtime files must never contain `NPM_TOKEN`. Supply it only as a BuildKit build secret.
- Build each environment separately when it uses different `NEXT_PUBLIC_*` values. Publish an immutable `linux/amd64` image digest and place that digest in its environment file.
- Caddy is the only maintained reverse proxy. Local Caddy listens on `8080`; production Caddy listens on `80` and `443`, manages certificates, redirects HTTP, and persists `/data` and `/config`.
- Preserve `Host`, client address, and forwarded-protocol headers. Keep `/api/health`, assets, checkout, API, and webhook routes behind Caddy.
- Rendered scripts are intentionally user-run. Confirm the GCP project, zone, static IP, VM service account, Artifact Registry, firewall ports, IAP administration, disk attachment, DNS, and recovery plan before executing them.
- A release should deploy immutable digests, wait for internal and public health, and use rollback when health checks fail. Schedule daily logical Postgres backups before disk snapshots and retain seven days.

## Existing projects

Run `pnpm shipflow upgrade` from a clean worktree to apply `proxy-caddy-v1`. It migrates the known generated Nginx service while retaining port `8080`. Customized Nginx or Compose files require a manual review; preserve their routes and forwarded headers while moving them to Caddy.

## Validate before handoff

Run:

```bash
pnpm shipflow deploy doctor --environment <name>
pnpm validate
pnpm test
pnpm build
```

Validate Caddy with the pinned image when Docker is available:

```bash
docker run --rm -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.8.4-alpine caddy validate --config /etc/caddy/Caddyfile
```
