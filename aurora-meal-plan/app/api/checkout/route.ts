import { NextResponse } from "next/server";
import Stripe from "stripe";
import { checkoutMetadata, type CheckoutInput } from "@aganoob/payments";
import { productById } from "../../../lib/products";

export async function POST(request: Request) {
  const input = await request.json() as CheckoutInput;
  const product = productById(input.productId);
  const offer = product?.offers[input.offerId];

  if (!product || !offer || !input.sessionId) {
    return NextResponse.json({ error: "Unknown checkout" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key?.trim()) {
    return NextResponse.json({ url: `${origin}/?checkout=mock`, mocked: true });
  }

  if (!offer.stripePriceId.startsWith("price_")) {
    console.error("Stripe checkout has an invalid price configuration", {
      productId: input.productId,
      offerId: input.offerId,
    });
    return NextResponse.json({ error: "Checkout is temporarily unavailable", code: "invalid_price_configuration" }, { status: 503 });
  }

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: offer.stripePriceId, quantity: 1 }],
      customer_email: input.email,
      success_url: `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: { ...checkoutMetadata(input), offer_id: input.offerId },
    });

    if (!session.url) {
      console.error("Stripe checkout returned no session URL", { productId: input.productId, offerId: input.offerId, sessionId: session.id });
      return NextResponse.json({ error: "Checkout is temporarily unavailable", code: "missing_checkout_url" }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const stripeError = error as Stripe.StripeRawError;
    console.error("Stripe checkout session creation failed", {
      productId: input.productId,
      offerId: input.offerId,
      type: stripeError.type,
      code: stripeError.code,
      statusCode: stripeError.statusCode,
      requestId: stripeError.requestId,
    });
    return NextResponse.json({ error: "Checkout is temporarily unavailable", code: "payment_provider_error" }, { status: 502 });
  }
}
