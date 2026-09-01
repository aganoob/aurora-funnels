# Stripe ↔ Aurora identity contract

Status: agreed with the Aurora CTO on 2026-08-31.

## Architecture decision

The Aurora backend has its own Stripe webhook endpoint and processes billing events independently of the web-funnel application and its deployments. Stripe may deliver the same event to a separate funnel endpoint for analytics, but Aurora's billing state and fulfilment cannot depend on that endpoint.

Use an opaque, stable Aurora identifier named `aurora_user_id` to correlate Stripe objects with an Aurora user. Keep the mapping between `stripe_customer_id` (`cus_...`) and `aurora_user_id` in the Aurora database.

Email remains the Stripe Customer email. Do not copy a raw email into Stripe metadata. A plain SHA hash of an email is also unsuitable as the primary identifier because the source space is easy to enumerate and email normalization rules can drift. If a derived identifier is temporarily unavoidable, derive it server-side as `HMAC-SHA-256(secret, normalized_email)` with a versioned normalization and key; treat it as personal data and plan a migration to `aurora_user_id`.

## Checkout contract

Before creating Checkout, the funnel server obtains or creates a stable Aurora user/checkout identity and reuses one Stripe Customer for it. Create the subscription Checkout Session with the same ID in all relevant downstream locations:

```ts
const identityMetadata = {
  aurora_user_id: auroraUserId,
};

await stripe.checkout.sessions.create({
  mode: "subscription",
  customer: stripeCustomerId,
  client_reference_id: auroraUserId,
  metadata: {
    ...checkoutMetadata(input),
    ...identityMetadata,
  },
  subscription_data: {
    metadata: identityMetadata,
  },
  line_items: [{ price: offer.stripePriceId, quantity: 1 }],
  success_url: `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/?checkout=cancelled`,
});
```

Set `aurora_user_id` on the Stripe Customer metadata when the Customer is created or linked. Passing `customer` to Checkout is important: it makes `cus_...` stable across the initial purchase and recurring charges. When `customer` is supplied, use the email stored on that Customer instead of `customer_email` on the Checkout Session.

If no Aurora user exists before Checkout, use the existing opaque `funnel_session_id` as the initial correlation key. On `checkout.session.completed`, Aurora resolves or creates the user from `customer_details.email`, stores the `cus_...` ↔ `aurora_user_id` mapping, and adds `aurora_user_id` to the Customer and Subscription metadata.

## Webhook lookup rules

| Event family | Where Aurora resolves the user |
| --- | --- |
| `checkout.session.*` | `client_reference_id`, then `metadata.aurora_user_id`; persist `customer` and `subscription` IDs |
| `customer.subscription.*` | `metadata.aurora_user_id`, with `customer` as the durable fallback |
| `invoice.paid`, `invoice.payment_failed` | subscription metadata snapshot (`parent.subscription_details.metadata` on current Stripe API versions), with `customer` as fallback |
| `charge.*`, `payment_intent.*`, refunds and disputes | `customer` → Aurora database mapping; retrieve Customer metadata on a cache miss |

Stripe metadata belongs to the object on which it was written. Checkout Session metadata does not automatically appear on a Charge. PaymentIntent metadata is copied to its Charge once, but Checkout's `payment_intent_data.metadata` applies to one-time `payment` mode and does not solve recurring subscription charges. For subscription lifecycle and renewals, process invoice events and keep the Customer mapping authoritative.

## Operational requirements

- Verify each webhook against its endpoint-specific signing secret using the raw request body.
- Make handling idempotent on `event.id`; Stripe retries events and can deliver duplicates.
- Do not depend on event order. Fetch the referenced Customer, Subscription, Invoice, or Charge when a prior mapping event has not arrived yet.
- Use separate endpoint secrets and test/live object mappings for staging and production.
- Pin and test the webhook endpoint's Stripe API version because invoice field locations vary across versions.

