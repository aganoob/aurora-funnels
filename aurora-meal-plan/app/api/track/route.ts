import { NextResponse } from "next/server";
import { canonicalEvents, type TrackedEvent } from "@aganoob/analytics";
import { withMatchContext } from "@aganoob/analytics-delivery";
import { funnelProducts } from "../../../funnels/registry";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? "0") > 64_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const submitted = await request.json() as TrackedEvent;
  const origin = request.headers.get("origin");
  try {
    if (origin && new URL(origin).host !== new URL(request.url).host) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const event = withMatchContext(submitted, request);
  if (!canonicalEvents.includes(event.event) || !event.context?.eventId || !event.context?.occurredAt) return NextResponse.json({ error: "Invalid canonical event" }, { status: 400 });
  const expectedProductId = funnelProducts[event.context.funnelId as keyof typeof funnelProducts];
  if (!expectedProductId) return NextResponse.json({
    error: "Invalid funnel context",
    code: "unknown_funnel",
    funnelId: event.context.funnelId,
  }, { status: 400 });
  if (expectedProductId !== event.context.productId) return NextResponse.json({
    error: "Invalid funnel context",
    code: "product_mismatch",
    funnelId: event.context.funnelId,
    productId: event.context.productId,
    expectedProductId,
  }, { status: 400 });
  if (["subscription_started", "subscription_renewed", "subscription_cancelled", "subscription_refunded"].includes(event.event)) return NextResponse.json({ error: "Server event required" }, { status: 403 });
  return NextResponse.json({ accepted: true, event_id: event.context.eventId, delivery: "browser-only" }, { status: 202 });
}
