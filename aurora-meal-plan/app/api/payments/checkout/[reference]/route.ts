import { NextResponse } from "next/server";
import { paymentProvider } from "../../../../../lib/payments/providers";

export async function GET(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const provider = new URL(request.url).searchParams.get("provider") ?? "stripe";
    return NextResponse.json(await paymentProvider(provider).getCheckoutOutcome(reference));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout status failed" }, { status: 400 });
  }
}
