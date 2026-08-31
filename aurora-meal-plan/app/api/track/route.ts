import { NextResponse } from "next/server";
import { canonicalEvents, type TrackedEvent } from "@aganoob/analytics";
import { serverAnalytics } from "../../../lib/analytics-server";
import { funnelProducts } from "../../../funnels/registry";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? "0") > 64_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const event = await request.json() as TrackedEvent;
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
  const providers = await serverAnalytics.deliver(event, request);
  return NextResponse.json({ accepted: true, providers }, { status: 202 });
}
