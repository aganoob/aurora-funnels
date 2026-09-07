import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gcpResourceNames } from "@aganoob/deployment-gcp-cloud-run";
import { GET } from "../app/api/health/route";
import { missingRuntimeConfiguration } from "../lib/runtime-config";
import deploymentConfig from "../shipflow.deploy";

describe("production runtime configuration", () => {
  it("requires billing and server analytics credentials in production", () => {
    expect(missingRuntimeConfiguration({ NODE_ENV: "production" })).toEqual([
      "META_CAPI_ACCESS_TOKEN",
      "NEXT_PUBLIC_APP_URL",
      "POSTHOG_PROJECT_API_KEY",
      "STRIPE_PRICE_AURORA_MEAL_PLAN_ANNUAL",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ]);
  });

  it("allows local development without production credentials", () => {
    expect(missingRuntimeConfiguration({ NODE_ENV: "development" })).toEqual([]);
  });
});

describe("staging deployment", () => {
  it("uses an isolated public Cloud Run service with the preview domain", () => {
    expect(deploymentConfig.environments.staging).toMatchObject({
      target: {
        projectId: "aurora-funnels",
        region: "europe-west1",
        service: "aurora-meal-staging",
      },
      domains: { primary: "preview-begin.aurorafirst.ai", aliases: [] },
      analyticsDelivery: { kind: "browser-only" },
    });

    const names = gcpResourceNames("staging", deploymentConfig.environments.staging.target);
    expect(names.buildServiceAccount).toHaveLength(30);
    expect(names.funnelServiceAccount).toHaveLength(30);
  });
});

describe("production deployment", () => {
  it("uses a separate Cloud Run service with the Aurora production domain", () => {
    expect(deploymentConfig.environments.production).toMatchObject({
      target: {
        projectId: "aurora-funnels",
        region: "europe-west1",
        service: "aurora-meal-production",
      },
      domains: { primary: "begin.aurorafirst.ai", aliases: [] },
      analyticsDelivery: { kind: "browser-only" },
    });

    expect(deploymentConfig.environments.production.target.service)
      .not.toBe(deploymentConfig.environments.staging.target.service);
  });
});

describe("CI/CD bootstrap", () => {
  it("grants source-staging bucket access to all Cloud Build identities", async () => {
    const bootstrap = await readFile(resolve(process.cwd(), "scripts/bootstrap-gcp-cicd.sh"), "utf8");

    expect(bootstrap).toContain("gcloud storage buckets add-iam-policy-binding");
    expect(bootstrap).toContain('--condition=None --quiet');
    expect(bootstrap).toContain('source_bucket="${project_id}_cloudbuild"');
    expect(bootstrap).toContain('gcloud builds get-default-service-account --project "$project_id"');
    expect(bootstrap).toContain(
      'grant_project_role "serviceAccount:${deploy_email}" roles/storage.bucketViewer',
    );
    expect(bootstrap).not.toContain(
      'grant_bucket_role "serviceAccount:${deploy_email}" roles/storage.bucketViewer',
    );
    expect(bootstrap).toContain('roles/storage.bucketViewer "$source_bucket"');
    expect(bootstrap).toContain('roles/storage.objectUser "$source_bucket"');
    expect(bootstrap).toContain('roles/storage.objectViewer "$source_bucket"');
    expect(bootstrap).toContain('entity=user-${account},role=WRITER');
    expect(bootstrap).toContain('gcloud storage buckets create "gs://${bucket}" --location US');
  });

  it("keeps the Docker dependency layer aligned with the current lockfile inputs", async () => {
    const dockerfile = await readFile(resolve(process.cwd(), "Dockerfile"), "utf8");

    expect(dockerfile).not.toContain("COPY patches ./patches");
  });
});

describe("health endpoint", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed when funnel credentials are missing", async () => {
    const response = GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, status: "configuration-error" });
  });

  it("fails closed when production credentials are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    const response = GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, status: "configuration-error" });
  });
});
