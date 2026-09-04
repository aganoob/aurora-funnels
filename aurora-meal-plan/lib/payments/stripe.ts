import Stripe from "stripe";
import { checkoutMetadata, type CheckoutInput, type CheckoutOutcome, type CheckoutPresentation, type PaymentProviderCapabilities } from "@aganoob/payments";
import type { OfferDefinition, ProviderOfferDefinition } from "@aganoob/core";

export const stripeCapabilities: PaymentProviderCapabilities = {
  presentations: ["redirect", "embedded"],
  subscriptions: true,
  trials: true,
  promotionCodes: true,
  preAppliedDiscounts: true,
  asynchronousPayments: true,
};

type StripeOffer = ProviderOfferDefinition["payment"] & { provider: "stripe" };

function stripeOffer(offer: OfferDefinition): StripeOffer {
  if (!("payment" in offer)) throw new Error("This offer uses the legacy Stripe configuration.");
  if (offer.payment.provider !== "stripe") throw new Error(`Unsupported payment provider: ${offer.payment.provider}`);
  return offer.payment as StripeOffer;
}

function checkoutOrigin(request: Request) {
  return process.env.SHIPFLOW_PUBLIC_URL ?? new URL(request.url).origin;
}

function amount(value: number | null | undefined) {
  return value === null || value === undefined ? undefined : value / 100;
}

function assignments(value: string | undefined) {
  try {
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

export async function createStripeCheckout({ request, input, offer, conversionContextId }: { request: Request; input: CheckoutInput; offer: OfferDefinition; conversionContextId?: string }): Promise<CheckoutPresentation> {
  const key = process.env.STRIPE_SECRET_KEY;
  const origin = checkoutOrigin(request);
  const localMock = process.env.NODE_ENV !== "production" && (process.env.MOCK_CHECKOUT === "true" || !key?.trim());
  if (localMock) {
    const reference = `mock_${crypto.randomUUID()}`;
    return { kind: "redirect", provider: "stripe", reference, mocked: true, url: `${origin}/f/${input.funnelId}?checkout=mock&session_id=${reference}&offer_id=${encodeURIComponent(input.offerId)}` };
  }
  if (!key?.trim()) throw new Error("Stripe is not configured");
  const payment = stripeOffer(offer);
  if (payment.catalogReference.startsWith("price_placeholder_")) throw new Error(`Stripe price is not configured for offer ${input.offerId}`);
  const presentation = payment.presentation ?? "embedded";
  const metadata = checkoutMetadata(input, { conversionContextId });
  const returnUrl = `${origin}/f/${input.funnelId}?checkout=return&provider=stripe&session_id={CHECKOUT_SESSION_ID}`;
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: payment.catalogReference, quantity: 1 }],
    customer_email: input.email,
    client_reference_id: input.sessionId,
    ...(payment.trialDays ? { subscription_data: { trial_period_days: payment.trialDays, metadata: { ...metadata, offer_id: input.offerId } } } : { subscription_data: { metadata: { ...metadata, offer_id: input.offerId } } }),
    metadata: { ...metadata, offer_id: input.offerId },
  };
  if (presentation === "embedded") {
    params.ui_mode = "embedded";
    params.return_url = returnUrl;
    params.redirect_on_completion = "if_required";
  } else {
    params.success_url = returnUrl;
    params.cancel_url = `${origin}/f/${input.funnelId}?checkout=cancelled`;
  }
  const session = await new Stripe(key).checkout.sessions.create(params, { idempotencyKey: `shipflow:${input.sessionId}:${input.offerId}` });
  if (presentation === "embedded") {
    if (!session.client_secret) throw new Error("Stripe did not return an embedded checkout client secret");
    return { kind: "embedded", provider: "stripe", reference: session.id, clientSecret: session.client_secret };
  }
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { kind: "redirect", provider: "stripe", reference: session.id, url: session.url };
}

export async function getStripeCheckoutOutcome(reference: string): Promise<CheckoutOutcome> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (reference.startsWith("mock_") && process.env.NODE_ENV !== "production" && (process.env.MOCK_CHECKOUT === "true" || !key?.trim())) return { provider: "stripe", reference, status: "paid" };
  if (!key?.trim()) throw new Error("Stripe is not configured");
  const session = await new Stripe(key).checkout.sessions.retrieve(reference, { expand: ["subscription", "total_details"] });
  const metadata = session.metadata ?? {};
  const subscription = typeof session.subscription === "object" && session.subscription ? session.subscription : undefined;
  const status: CheckoutOutcome["status"] = session.status === "open" ? "pending" : session.payment_status === "unpaid" ? "failed" : subscription?.status === "trialing" ? "trialing" : "paid";
  return { provider: "stripe", reference: session.id, status, productId: metadata.product_id, funnelId: metadata.funnel_id, offerId: metadata.offer_id, subscriptionId: subscription?.id ?? (typeof session.subscription === "string" ? session.subscription : undefined), assignments: assignments(metadata.experiment_assignments), conversionContextId: metadata.shipflow_context_id, subtotal: amount(session.amount_subtotal), amount: amount(session.amount_total), discountAmount: amount(session.total_details?.amount_discount), currency: session.currency ?? undefined };
}

export async function stripeWebhookOutcome(event: Stripe.Event): Promise<CheckoutOutcome | undefined> {
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return undefined;
  const checkout = event.data.object as Stripe.Checkout.Session;
  if (checkout.payment_status === "unpaid") return undefined;
  return getStripeCheckoutOutcome(checkout.id);
}
