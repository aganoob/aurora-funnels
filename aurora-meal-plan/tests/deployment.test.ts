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

describe("health endpoint", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reports readiness outside production", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("fails closed when production credentials are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    const response = GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, status: "configuration-error" });
  });
});
