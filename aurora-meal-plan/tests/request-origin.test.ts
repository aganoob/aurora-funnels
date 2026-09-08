import { afterEach, describe, expect, it, vi } from "vitest";
import { hasValidRequestOrigin } from "../lib/request-origin";

const requestFrom = (origin?: string) => new Request("http://internal-service:3000/api/payments/checkout", {
  headers: origin ? { origin } : undefined,
});

describe("request origin validation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts the configured public origin behind a proxy", () => {
    vi.stubEnv("SHIPFLOW_PUBLIC_URL", "https://preview-begin.aurorafirst.ai");

    expect(hasValidRequestOrigin(requestFrom("https://preview-begin.aurorafirst.ai"))).toBe(true);
  });

  it("rejects a different public origin", () => {
    vi.stubEnv("SHIPFLOW_PUBLIC_URL", "https://preview-begin.aurorafirst.ai");

    expect(hasValidRequestOrigin(requestFrom("https://example.com"))).toBe(false);
  });

  it("uses the request URL when no public URL is configured", () => {
    vi.stubEnv("SHIPFLOW_PUBLIC_URL", "");

    expect(hasValidRequestOrigin(requestFrom("http://internal-service:3000"))).toBe(true);
  });

  it("allows clients without an Origin header", () => {
    expect(hasValidRequestOrigin(requestFrom())).toBe(true);
  });
});
