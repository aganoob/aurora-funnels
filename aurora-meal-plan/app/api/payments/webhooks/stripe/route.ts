import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripeWebhookOutcome } from "../../../../../lib/payments/stripe";
import { deliveryAdapter } from "../../../../../lib/delivery";
import { withMatchContext, type DeliveryEnvelopeV1 } from "@aganoob/analytics-delivery";
import type { TrackedEvent } from "@aganoob/analytics";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret?.trim() || !key?.trim()) return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Stripe signature missing" }, { status: 400 });
  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = new Stripe(key).webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Stripe signature verification failed" }, { status: 400 });
  }
  const outcome = await stripeWebhookOutcome(stripeEvent);
  if (!outcome || (outcome.status !== "paid" && outcome.status !== "trialing")) return NextResponse.json({ received: true });
  if (!outcome.productId || !outcome.funnelId || !outcome.offerId) return NextResponse.json({ error: "Stripe checkout metadata is incomplete" }, { status: 400 });
  const event: TrackedEvent = withMatchContext({
    event: "subscription_started",
    properties: { checkout_session_id: outcome.reference, offer_id: outcome.offerId, plan_status: outcome.status, subtotal: outcome.subtotal, discount_amount: outcome.discountAmount, value: outcome.amount, currency: outcome.currency, subscription_id: outcome.subscriptionId },
    context: { eventId: `stripe_${stripeEvent.id}`, occurredAt: new Date(stripeEvent.created * 1_000).toISOString(), productId: outcome.productId, funnelId: outcome.funnelId, funnelVersion: "server", sessionId: (stripeEvent.data.object as Stripe.Checkout.Session).metadata?.funnel_session_id ?? outcome.reference, assignments: outcome.assignments ?? {}, attribution: { firstTouch: {}, currentTouch: {} }, conversionContextId: outcome.conversionContextId },
  });
  if (deliveryAdapter) {
    const result = await deliveryAdapter.enqueue({ version: 1, id: event.context.eventId, event } satisfies DeliveryEnvelopeV1);
    if (!result.accepted) return NextResponse.json({ error: "Analytics delivery enqueue failed" }, { status: 503 });
  }
  return NextResponse.json({ received: true });
}
