import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/health/route";
import { missingRuntimeConfiguration } from "../lib/runtime-config";

describe("production runtime configuration", () => {
  it("requires billing, delivery, and server analytics credentials in production", () => {
    expect(missingRuntimeConfiguration({ NODE_ENV: "production" })).toEqual([
      "DATABASE_URL",
      "META_CAPI_ACCESS_TOKEN",
      "NEXT_PUBLIC_APP_URL",
      "POSTHOG_PROJECT_API_KEY",
      "SHIPFLOW_DELIVERY_ENCRYPTION_KEY",
      "STRIPE_PRICE_AURORA_MEAL_PLAN_ANNUAL",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ]);
  });

  it("allows local development without production credentials", () => {
    expect(missingRuntimeConfiguration({ NODE_ENV: "development" })).toEqual([]);
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
