import { afterEach, describe, expect, it, vi } from "vitest";

const { create, productById } = vi.hoisted(() => ({
  create: vi.fn(),
  productById: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({ checkout: { sessions: { create } } })),
}));
vi.mock("../lib/products", () => ({ productById }));

import { POST } from "../app/api/checkout/route";

const checkoutInput = {
  funnelId: "aurora-meal-plan",
  productId: "aurora-meal-plan",
  offerId: "annual",
  sessionId: "session-1",
  assignments: {},
  attribution: { firstTouch: {}, currentTouch: {} },
};

const requestFor = () => new Request("http://localhost:3000/api/checkout", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(checkoutInput),
});

describe("checkout route", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("reports an invalid Stripe price configuration without calling Stripe", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    productById.mockReturnValue({ offers: { annual: { payment: { provider: "stripe", catalogReference: "price_placeholder_annual", presentation: "embedded" } } } });

    const response = await POST(requestFor());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Stripe price is not configured for offer annual" });
    expect(create).not.toHaveBeenCalled();
  });

  it("returns an API error when Stripe rejects checkout creation", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    productById.mockReturnValue({ offers: { annual: { payment: { provider: "stripe", catalogReference: "price_annual", presentation: "embedded" } } } });
    create.mockRejectedValue({ type: "StripeInvalidRequestError", code: "resource_missing", statusCode: 404 });

    const response = await POST(requestFor());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Checkout creation failed" });
  });

  it("returns an embedded checkout presentation after a successful checkout", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    productById.mockReturnValue({ offers: { annual: { payment: { provider: "stripe", catalogReference: "price_annual", presentation: "embedded" } } } });
    create.mockResolvedValue({ id: "cs_test_123", client_secret: "cs_test_secret" });

    const response = await POST(requestFor());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ kind: "embedded", provider: "stripe", reference: "cs_test_123", clientSecret: "cs_test_secret" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      ui_mode: "embedded",
      return_url: "http://localhost:3000/f/aurora-meal-plan?checkout=return&provider=stripe&session_id={CHECKOUT_SESSION_ID}",
    }), { idempotencyKey: "shipflow:session-1:annual" });
  });
});
