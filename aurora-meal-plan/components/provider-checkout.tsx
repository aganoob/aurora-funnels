"use client";

import type { CheckoutPresentation } from "@aganoob/payments";
import { StripeEmbeddedCheckout } from "./stripe-embedded-checkout";

export function ProviderCheckout({ presentation, onComplete }: { presentation: Extract<CheckoutPresentation, { kind: "embedded" }>; onComplete: () => void }) {
  if (presentation.provider === "stripe") return <StripeEmbeddedCheckout clientSecret={presentation.clientSecret} onComplete={onComplete} />;
  return <p className="aurora-checkout-error" role="alert">This payment provider does not have a browser checkout adapter.</p>;
}
