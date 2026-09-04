"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export function StripeEmbeddedCheckout({ clientSecret, onComplete }: { clientSecret: string; onComplete: () => void }) {
  if (!stripePromise) return <p className="aurora-checkout-error" role="alert">Stripe Checkout needs NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</p>;
  return <EmbeddedCheckoutProvider key={clientSecret} stripe={stripePromise} options={{ clientSecret, onComplete }}><EmbeddedCheckout /></EmbeddedCheckoutProvider>;
}
