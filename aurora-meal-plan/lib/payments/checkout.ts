import { captureMatchContext } from "@aganoob/analytics-delivery";
import type { TrackedEvent } from "@aganoob/analytics";
import type { CheckoutInput } from "@aganoob/payments";
import { funnels } from "../../funnels/catalog";
import { deliveryAdapter } from "../delivery";
import { productById } from "../products";
import { paymentProvider } from "./providers";

function validInput(input: Partial<CheckoutInput>): input is CheckoutInput {
  const short = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 128;
  const assignments = input.assignments && Object.entries(input.assignments).every(([key, value]) => short(key) && short(value));
  return Boolean(short(input.funnelId) && short(input.productId) && short(input.offerId) && short(input.sessionId) && assignments && input.attribution?.firstTouch && input.attribution?.currentTouch);
}

export async function createCheckoutForRequest(request: Request, input: Partial<CheckoutInput>) {
  if (!validInput(input)) throw new Error("Invalid checkout request");
  const funnel = funnels[input.funnelId as keyof typeof funnels];
  const product = productById(input.productId);
  const offer = product?.offers[input.offerId];
  if (!funnel || funnel.productId !== input.productId || !product || !offer) throw new Error("Unknown funnel, product, or offer");
  if (funnel.checkoutOffers && !funnel.checkoutOffers.includes(input.offerId)) throw new Error("Offer is unavailable in this funnel");
  if (!("payment" in offer)) throw new Error(`Offer ${input.offerId} uses the legacy Stripe configuration`);

  const event: TrackedEvent = {
    event: "checkout_started",
    properties: { offer_id: input.offerId },
    context: {
      eventId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      productId: input.productId,
      funnelId: input.funnelId,
      funnelVersion: "checkout",
      sessionId: input.sessionId,
      assignments: input.assignments,
      attribution: input.attribution,
      sourceUrl: input.sourceUrl,
      identity: { email: input.email },
      consent: input.consent,
    },
  };
  const match = captureMatchContext(event, request);
  let conversionContextId: string | undefined;
  if (deliveryAdapter && input.consent?.meta !== "denied") {
    try {
      conversionContextId = await deliveryAdapter.createContext({ match, attribution: input.attribution, createdAt: new Date().toISOString() });
    } catch (error) {
      console.error(JSON.stringify({ level: "error", event: "shipflow_delivery_context_failed", sessionId: input.sessionId, message: error instanceof Error ? error.message : "Unknown error" }));
    }
  }

  const provider = paymentProvider(offer.payment.provider);
  if (!provider.capabilities.presentations.includes(offer.payment.presentation ?? "embedded")) throw new Error(`${provider.id} does not support ${offer.payment.presentation ?? "embedded"} checkout`);
  if (offer.payment.trialDays && !provider.capabilities.trials) throw new Error(`${provider.id} does not support subscription trials`);
  return provider.createCheckout({ request, checkout: input, offer, conversionContextId });
}
