import type { PaymentProviderAdapter } from "@aganoob/payments";
import type { ProviderOfferDefinition } from "@aganoob/core";
import { createStripeCheckout, getStripeCheckoutOutcome, stripeCapabilities } from "./stripe";

export type ServerPaymentProvider = PaymentProviderAdapter<ProviderOfferDefinition>;

export const paymentProviders: Record<string, ServerPaymentProvider> = {
  stripe: {
    id: "stripe",
    capabilities: stripeCapabilities,
    createCheckout: ({ request, checkout, offer, conversionContextId }) => createStripeCheckout({ request, input: checkout, offer, conversionContextId }),
    getCheckoutOutcome: getStripeCheckoutOutcome,
  },
};

export function paymentProvider(id: string) {
  const provider = paymentProviders[id];
  if (!provider) throw new Error(`Unsupported payment provider: ${id}`);
  return provider;
}
