import { NextResponse } from "next/server";
import type { CheckoutInput } from "@aganoob/payments";
import { createCheckoutForRequest } from "../../../../lib/payments/checkout";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? "0") > 64_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const origin = request.headers.get("origin");
  try {
    if (origin && new URL(origin).host !== new URL(request.url).host) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  try {
    return NextResponse.json(await createCheckoutForRequest(request, await request.json() as Partial<CheckoutInput>));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout creation failed" }, { status: 400 });
  }
}
