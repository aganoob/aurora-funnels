import { afterEach, describe, expect, it, vi } from "vitest";
import { journeyWelcomeUrl } from "../lib/journey";

describe("Journey welcome URL", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the configured production origin and preserves the funnel session ID", () => {
    vi.stubEnv("NEXT_PUBLIC_JOURNEY_BASE_URL", "https://journey.aurorafirst.ai");

    expect(journeyWelcomeUrl("session value")).toBe("https://journey.aurorafirst.ai/welcome?funnel_session_id=session+value&platform=custom_funnel");
  });

  it("uses the staging Journey origin when no public origin is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_JOURNEY_BASE_URL", "");

    expect(journeyWelcomeUrl("session-1")).toBe("https://ai-journey-alpha.web.app/welcome?funnel_session_id=session-1&platform=custom_funnel");
  });
});
