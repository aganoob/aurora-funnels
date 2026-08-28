import { describe, expect, it, vi } from "vitest";

const { deliver } = vi.hoisted(() => ({
  deliver: vi.fn(async () => [{ status: "disabled", provider: "posthog" }]),
}));

vi.mock("../lib/analytics-server", () => ({ serverAnalytics: { deliver } }));
vi.mock("../funnels/catalog", () => ({
  funnels: {
    "aurora-meal-plan": { id: "aurora-meal-plan", productId: "aurora-meal-plan" },
  },
}));

import { POST } from "../app/api/track/route";

const event = {
  event: "funnel_viewed" as const,
  properties: {},
  context: {
    eventId: "event-1",
    occurredAt: "2026-08-28T00:00:00.000Z",
    funnelId: "aurora-meal-plan",
    productId: "aurora-meal-plan",
    funnelVersion: "1.0.0",
    sessionId: "session-1",
    assignments: {},
    attribution: { firstTouch: {}, currentTouch: {} },
  },
};

const requestFor = (payload: unknown) => new Request("http://localhost:3000/api/track", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});

describe("analytics tracking route", () => {
  it("accepts events for the registered funnel and product", async () => {
    const response = await POST(requestFor(event));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ accepted: true, providers: [{ status: "disabled", provider: "posthog" }] });
    expect(deliver).toHaveBeenCalledWith(event, expect.any(Request));
  });

  it("identifies an unknown funnel ID", async () => {
    const response = await POST(requestFor({ ...event, context: { ...event.context, funnelId: "old-funnel" } }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid funnel context", code: "unknown_funnel", funnelId: "old-funnel" });
  });

  it("identifies a product ID that disagrees with the funnel", async () => {
    const response = await POST(requestFor({ ...event, context: { ...event.context, productId: "old-product" } }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid funnel context",
      code: "product_mismatch",
      funnelId: "aurora-meal-plan",
      productId: "old-product",
      expectedProductId: "aurora-meal-plan",
    });
  });
});
