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
    productById.mockReturnValue({ offers: { annual: { stripePriceId: "prod_instead_of_price" } } });

    const response = await POST(requestFor());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Checkout is temporarily unavailable", code: "invalid_price_configuration" });
    expect(create).not.toHaveBeenCalled();
  });

  it("returns a recoverable response when Stripe rejects checkout creation", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    productById.mockReturnValue({ offers: { annual: { stripePriceId: "price_annual" } } });
    create.mockRejectedValue({ type: "StripeInvalidRequestError", code: "resource_missing", statusCode: 404 });

    const response = await POST(requestFor());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Checkout is temporarily unavailable", code: "payment_provider_error" });
  });

  it("returns customers to the thank-you page after a successful checkout", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    productById.mockReturnValue({ offers: { annual: { stripePriceId: "price_annual" } } });
    create.mockResolvedValue({ id: "cs_test_123", url: "https://checkout.stripe.com/c/pay/cs_test_123" });

    const response = await POST(requestFor());

    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      success_url: "http://localhost:3000/thank-you?session_id={CHECKOUT_SESSION_ID}",
    }));
  });
});
