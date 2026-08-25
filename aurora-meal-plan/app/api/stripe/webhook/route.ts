import { NextResponse } from "next/server";
import Stripe from "stripe";
import type { TrackedEvent } from "@aganoob/analytics";
import { mergeMatchContext, withMatchContext } from "@aganoob/analytics-delivery";
import { getDelivery } from "../../../../lib/delivery";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret?.trim() || !key?.trim()) return NextResponse.json({ received: true, mocked: true }, { status: 202 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Stripe signature missing" }, { status: 400 });
  let stripeEvent: Stripe.Event;
  try { stripeEvent = new Stripe(key).webhooks.constructEvent(await request.text(), signature, secret); } catch { return NextResponse.json({ error: "Stripe signature verification failed" }, { status: 400 }); }
  if (stripeEvent.type !== "checkout.session.completed") return NextResponse.json({ received: true });
  const checkout = stripeEvent.data.object as Stripe.Checkout.Session;
  const metadata = checkout.metadata ?? {};
  const attribution = { firstTouch: { fbp: metadata.shipflow_fbp, fbc: metadata.shipflow_fbc, landing_url: metadata.shipflow_source_url }, currentTouch: { fbp: metadata.shipflow_fbp, fbc: metadata.shipflow_fbc, landing_url: metadata.shipflow_source_url } };
  const event: TrackedEvent = { event: "subscription_started", properties: { checkout_session_id: checkout.id, offer_id: metadata.offer_id, value: checkout.amount_total ? checkout.amount_total / 100 : undefined, currency: checkout.currency }, context: { eventId: `stripe_${stripeEvent.id}`, occurredAt: new Date(stripeEvent.created * 1_000).toISOString(), productId: metadata.product_id ?? "unknown", funnelId: metadata.funnel_id ?? "unknown", funnelVersion: "server", sessionId: metadata.funnel_session_id ?? checkout.id, assignments: metadata.experiment_assignments ? JSON.parse(metadata.experiment_assignments) : {}, attribution, clientUserAgent: metadata.shipflow_user_agent, identity: { email: checkout.customer_details?.email ?? undefined } } };
  const context = metadata.shipflow_context_id ? await getDelivery().readContext(metadata.shipflow_context_id) : undefined;
  const queued = await getDelivery().enqueue({ version: 1, id: event.context.eventId, event: withMatchContext(mergeMatchContext(event, context)) });
  if (!queued.accepted) return NextResponse.json({ error: queued.message }, { status: 503 });
  return NextResponse.json({ received: true, deliveryJobId: queued.id }, { status: 202 });
}
