---
name: funnel-builder
description: Design, implement, clone, and improve high-converting, mobile-first Shipflow funnels using the shared React SDK, canonical measurement, product configuration, and checkout flow.
---

# Shipflow Funnel Builder

Use this skill for a new funnel, a cloned funnel, a conversion-focused screen change, or a visual refresh in a Shipflow application. It covers the browser funnel experience and its configuration. The application’s provider adapters handle analytics delivery, payment processing, and backend delivery.

## Outcome

Build a polished, focused flow that helps a visitor make one small decision per screen, reaches a clearly explained offer, and produces complete canonical measurement. The visual language should feel at home beside contemporary mobile-first subscription funnels: confident hierarchy, generous spacing, lightweight progress, clear choices, tailored results, and a high-trust paywall.

Keep the funnel easy to understand in code:

```text
Product configuration       Funnel definition          Runtime application
lib/products.ts             funnels/catalog.tsx        components/funnel-app.tsx
domains, offers, prices     screens, copy, routing     session, navigation, events,
brand tokens                and reusable composition   attribution, experiments, checkout
```

## Start with the right scope

Determine which of these requests you have before editing:

| Request | Primary location | Expected work |
| --- | --- | --- |
| New product or price | `lib/products.ts` | Add a product, offers, domain, and environment-backed Stripe price IDs. |
| New flow for an existing product | `funnels/catalog.tsx` | Compose semantic screens and register the funnel. |
| New screen treatment | Funnel catalog first; shared package when reusable | Write a React screen component and define its semantic role. |
| Repeated UI or sequence | `packages/funnel-components` or `packages/funnel-patterns` | Promote it, export it, and add registry metadata. |
| Navigation, persistence, analytics, checkout, attribution, or experiment assignment | `components/funnel-app.tsx` | Extend the runtime integration with canonical SDK primitives. |
| Provider behavior or server secrets | API route / provider adapter | Keep secret-bearing work server-side and preserve canonical event delivery. |

For a greenfield independent application, begin with `pnpm create @aganoob/funnel <project-name>`. In an existing Shipflow application, inspect its catalog, product configuration, runtime component, host routing, and API routes before designing the change.

## Discovery before design

Search the available building blocks before introducing UI or copying a flow. Start with:

```bash
rg -n "defineFunnel|defineScreen|function .*Paywall|function .*Question" funnels apps packages
rg -n "searchRegistry|registry" packages/registry apps packages
rg -n "export (function|const)" packages/funnel-components packages/funnel-patterns
```

Review these sources in this order:

1. `packages/registry` for catalogued reusable components, paywalls, and sequences.
2. `packages/funnel-components` for UI primitives such as `Shell`, `ChoiceList`, and `PrimaryButton`.
3. `packages/funnel-patterns` for reusable answer fields and sequences.
4. Existing funnel catalogs for screens, branching, paywalls, copy density, and design tokens.
5. The consuming app’s `components/funnel-app.tsx` for the runtime contract already in use.

Name a screen by its role (`welcome`, `sleep-goal`, `plan-preview`, `paywall`) and keep its ID stable after launch. Screen IDs feed analytics, session recovery, and experiment analysis.

## Design a funnel before coding

Start with a short funnel brief. Capture the audience, desired outcome, offer, proof, primary objection, decision required on each screen, and the event that marks successful payment. A concise brief keeps the visual direction and measurement aligned.

A reliable subscription-funnel shape is:

```text
Promise → qualification quiz → momentum/proof → tailored result → offer → checkout → success
```

Use every stage only when it earns its place. A short product with a clear offer may use `landing → paywall → checkout`. A personalized product benefits from a few question screens and a result screen that uses the visitor’s answers.

### Conversion and content rules

- Give each screen one dominant action. Supporting links such as “Back” or “Privacy” stay visually quiet.
- Ask questions whose answers improve the outcome, offer, segmentation, or future analysis. Remove curiosity-only questions.
- Make questions effortless to scan: a concise prompt, 3–6 mutually exclusive choices, clear selected state, and a visible continuation behavior.
- Put the promised value before the effort. The opening should explain who the product helps, what changes, and the time or effort required.
- Use the result screen to connect answers to a believable plan. It should feel personal while avoiding medical, financial, or performance claims that the product cannot support.
- Explain price, period, renewal terms, trial terms, and cancellation path on the paywall in the same visual system as the CTA.
- Use real testimonials, evidence, ratings, and before/after claims only when approved and supportable. Treat proof as product content with an owner and source.
- Preserve consent and legal copy required by the product or jurisdiction. Place it close to the action it qualifies.

### Visual direction

Aim for a distinctive brand experience that works on a 360px viewport and grows gracefully:

- **Composition:** one centered content column, one primary card or visual focal point, and steady vertical rhythm. Avoid competing panels.
- **Type:** an oversized, tightly led headline; a calm, readable body; an uppercase or small-label eyebrow for orientation. Keep line length comfortable.
- **Color:** use the product’s `brand` colors as tokens. Reserve the strongest accent for selection, progress, and the primary CTA.
- **Controls:** use large touch targets, visible keyboard focus, selected and disabled states, and text that describes the next outcome.
- **Progress:** display a subtle progress indicator for a multi-step flow. Progress should be honest; calculate it from the current screen and the defined sequence.
- **Motion:** limit movement to quick feedback and screen transitions. Respect `prefers-reduced-motion`, and keep the action available while animation loads.
- **Imagery:** give imagery a clear job: demonstrate the product, create an emotional setting, or visualize the result. Optimize it for mobile, reserve dimensions to prevent layout shift, and ensure text remains legible over it.
- **Accessibility:** use native buttons and inputs, descriptive labels, semantic headings, sufficient contrast, keyboard navigation, and `aria-live` feedback when an asynchronous action changes state.

Start from the existing `Shell` and its progress bar. Extend global styles with reusable tokens and component classes when the treatment is shared. Keep bespoke screen styling near the funnel when it belongs to one product.

## Implement the semantic flow

Shipflow funnels are React components described with `defineScreen` and collected by `defineFunnel`.

```tsx
"use client";

import { ChoiceList, PrimaryButton } from "@aganoob/components";
import {
  defineFunnel,
  defineScreen,
  type ScreenProps,
} from "@aganoob/core";

function Welcome({ next }: ScreenProps) {
  return (
    <section className="welcome-screen">
      <p className="eyebrow">Atlas sleep</p>
      <h1>Build calmer nights in a few minutes.</h1>
      <p>Answer three questions and we’ll shape a practical wind-down plan.</p>
      <PrimaryButton onClick={next}>Build my plan</PrimaryButton>
    </section>
  );
}

function SleepGoal({ setAnswer, next }: ScreenProps) {
  return (
    <section>
      <p className="eyebrow">Your goal</p>
      <h2>What would make tonight feel better?</h2>
      <ChoiceList
        choices={["Fall asleep faster", "Wake up less", "Feel rested"]}
        onChoose={(value) => {
          setAnswer("sleep_goal", value);
          next();
        }}
      />
    </section>
  );
}

function PlanPreview({ session, next }: ScreenProps) {
  const goal = String(session.answers.sleep_goal ?? "better rest").toLowerCase();
  return (
    <section className="card">
      <p className="eyebrow">Your starting point</p>
      <h1>A gentler route to {goal}.</h1>
      <p>Your first plan focuses on a repeatable evening cue and a small next-day adjustment.</p>
      <PrimaryButton onClick={next}>See membership options</PrimaryButton>
    </section>
  );
}

function Paywall({ checkout }: ScreenProps) {
  return (
    <section className="card">
      <p className="eyebrow">Your membership</p>
      <h2>Start with one year of guided sleep support.</h2>
      <p>$49 USD billed annually. Cancel according to the terms shown at checkout.</p>
      <PrimaryButton onClick={() => void checkout("annual")}>Start annual membership</PrimaryButton>
    </section>
  );
}

function Success() {
  return <section><p className="eyebrow">You’re in</p><h1>Your first step is ready.</h1></section>;
}

export const atlasSleep = defineFunnel({
  id: "atlas-sleep",
  productId: "atlas-sleep",
  domains: ["sleep.example.com"],
  defaultOffer: "annual",
  screens: [
    defineScreen({ id: "welcome", type: "landing", component: Welcome }),
    defineScreen({ id: "sleep-goal", type: "quiz_question", component: SleepGoal, output: { field: "sleep_goal" } }),
    defineScreen({ id: "plan-preview", type: "result", component: PlanPreview }),
    defineScreen({ id: "paywall", type: "paywall", component: Paywall, conversion: "subscription_started" }),
    defineScreen({ id: "success", type: "success", component: Success }),
  ],
});
```

`defineFunnel` validation covers non-empty, unique screen IDs and static `next` targets. Review business copy, offers, visual quality, and dynamic routing directly.

### Screen contract

Each screen gets this contract:

```ts
type ScreenProps = {
  session: FunnelSession;
  setAnswer: (field: string, value: string | number | boolean) => void;
  next: () => void;
  previous: () => void;
  goTo: (screenId: string) => void;
  checkout: (offerId: string) => Promise<void>;
};
```

Use `setAnswer` before `next` when the destination depends on an answer. The standard app runtime stores answers, identity, experiment assignments, and timestamps in a `FunnelSession`. Keep answer fields concise, stable, and meaningful; they become part of the analytical vocabulary.

### Choose a semantic screen type

The type records the job of the screen for analytics and future reuse. Pick the closest established term.

| Type | Use for |
| --- | --- |
| `landing` | Promise, audience, and entry CTA. |
| `quiz_question` | A discrete answer that qualifies or personalizes the journey. |
| `content` | Education, objection handling, or an interstitial commitment step. |
| `social_proof` | Testimonial, evidence, ratings, or customer story. |
| `email_capture` | Collecting contact details with clear consent. |
| `transition` | A short handoff between stages. |
| `loader` | A purposeful, brief processing state. Ensure a useful fallback path. |
| `result` | Personalized insight or plan preview. |
| `plan` | Plan details or an offer comparison before purchase. |
| `paywall` | Subscription offer, price, terms, and checkout CTA. |
| `checkout` | An on-site checkout step when the application supports one. |
| `upsell` | A post-purchase or add-on offer. |
| `success` | Confirmation and the next meaningful action. |

The runtime also accepts custom strings for a specialized semantic role. Add a custom type only when its analytics and reuse value is clear across the product.

### Sequence, branches, and back navigation

The default destination is the next item in `screens`. Use `next` for a fixed jump or a function for an answer-dependent route:

```tsx
defineScreen({
  id: "goal",
  type: "quiz_question",
  component: Goal,
  output: { field: "goal" },
  next: (session) => session.answers.goal === "Build strength" ? "strength-plan" : "everyday-plan",
});
```

Every dynamic branch must lead to a screen ID in the same funnel. Test every answer path, the browser Back button behavior that your app provides, and the in-funnel `previous` control. A `goTo` call suits an explicit, intentional jump such as editing an answer; ordinary forward flow should use `next` so completion measurement stays coherent.

### Reuse without coupling products

Set `reusable: true` for a screen that has proven useful beyond its current funnel. Promote the component or sequence when a second real consumer needs it:

- Put generic visual controls in `@aganoob/components`.
- Put generic answer-field lists and sequence definitions in `@aganoob/patterns`.
- Add a `RegistryItem` in `@aganoob/registry` with an accurate `type`, source, tags, and `reusable: true`.
- Keep product copy, promises, product IDs, domains, prices, and offer IDs in the consuming app.

Avoid abstracting a one-off visual treatment before its use is understood. A well-named local component is a strong starting point.

## Configure product, offer, and routing

Each funnel references a product ID and offer IDs. Configure them together in the consuming app’s `lib/products.ts`:

```ts
export const atlasSleepProduct = defineProduct({
  id: "atlas-sleep",
  domains: ["sleep.example.com"],
  brand: {
    name: "Atlas Sleep",
    accent: "#7be0c3",
    background: "#091a2a",
  },
  offers: {
    annual: {
      stripePriceId: process.env.STRIPE_PRICE_ATLAS_SLEEP_ANNUAL ?? "price_placeholder_annual",
      label: "Annual membership",
      amount: 4900,
      currency: "usd",
    },
  },
});
```

Keep these identifiers aligned:

| Identifier | Must agree with |
| --- | --- |
| `funnel.productId` | A key in the app’s `products` record. |
| `funnel.defaultOffer` and `checkout("…")` | An offer key on that product. |
| `funnel.domains` | The host routing configuration and deployed domain. |
| `ProductDefinition.domains` | The funnel domain(s) for the product. |
| `stripePriceId` | The server-side Stripe configuration for the intended environment. |

Use `NEXT_PUBLIC_*` only for browser-safe configuration. Store Stripe secret keys, webhook secrets, provider API keys, and backend webhook secrets in server environment variables. Keep secrets out of funnel source, client components, and product configuration.

## Preserve measurement, attribution, and checkout

The reference `FunnelApp` owns lifecycle instrumentation. A funnel catalog should remain declarative: screens call `next`, set answers, and call `checkout(offerId)`.

### Canonical events

The analytics package accepts these canonical event names:

```text
funnel_viewed             funnel_started            screen_viewed
screen_completed          quiz_started              quiz_question_viewed
quiz_question_answered    quiz_completed            email_capture_viewed
email_submitted           result_viewed             paywall_viewed
offer_selected            checkout_started          checkout_completed
subscription_started      subscription_renewed      subscription_cancelled
upsell_viewed             upsell_accepted           funnel_completed
```

`track` enriches each event with product, funnel, version, session, screen, experiment assignments, and current-touch attribution. Send canonical names and meaningful properties such as `offer_id`, `field`, `value`, or a consent indicator. Provider adapters map those events to PostHog and Meta; screen components use the shared canonical analytics APIs.

When adding a lifecycle event to the runtime, create a fresh `eventId` for every send. Keep the same session ID throughout the journey. This gives browser and server conversion delivery a common identity.

### Wire lifecycle events in the runtime

The canonical event list is a vocabulary that requires explicit runtime instrumentation. The reference runtime emits `funnel_viewed`, `screen_viewed`, `screen_completed`, `quiz_question_answered`, and `checkout_started`. Extend `FunnelApp` when the funnel needs the complementary lifecycle events below, keeping event emission in the runtime layer instead of individual screen components.

| Moment | Event | Useful properties |
| --- | --- | --- |
| First meaningful funnel interaction | `funnel_started` | Entry CTA or acquisition context. |
| First question appears | `quiz_started` | Quiz ID or sequence ID. |
| Each question appears | `quiz_question_viewed` | `field`, question position. |
| Answer is saved | `quiz_question_answered` | `field`, answer value when permitted. |
| Final question completes | `quiz_completed` | Completion count or sequence ID. |
| Email screen appears or submits | `email_capture_viewed`, `email_submitted` | Consent state; keep email itself out of analytics properties. |
| Result, paywall, or upsell appears | `result_viewed`, `paywall_viewed`, `upsell_viewed` | Offer ID or result category. |
| A visitor chooses an offer | `offer_selected` | `offer_id`, amount, currency. |
| Stripe redirect returns successfully | `checkout_completed` | Checkout session ID when available. |
| Success screen completes the product journey | `funnel_completed` | Final screen ID. |

Use one event per user-visible transition. React effects should guard against duplicate sends during state restoration, development rendering, and revisits unless repeat views are an intentional metric.

### Attribution

At entry, call `captureAttribution(new URL(window.location.href), document.referrer)` and store the result by funnel ID. Preserve `firstTouch`, update `currentTouch` each visit, and pass both to `track` and `createCheckout`.

The helper captures UTM parameters, click IDs, referrer, landing URL, and Meta cookies. `mergeAttribution` provides the expected `{ firstTouch, currentTouch }` shape. Keep that object through checkout metadata so a confirmed subscription can retain the acquisition context.

### Checkout and success

Call `checkout(offerId)` from the paywall. The runtime sends `checkout_started`, calls `createCheckout`, and sends the visitor to the returned URL. The server validates the product and offer, creates Stripe Checkout, and attaches the funnel session, product, offer, assignments, and attribution as metadata.

The Stripe webhook is the source for confirmed `subscription_started`. Treat a checkout redirect as an intent signal; keep fulfillment, provider forwarding, and backend delivery on the server after webhook verification.

### Experiments

Create an experiment with stable string variant IDs and assign it once per session:

```tsx
const paywallExperiment = experiment(
  "atlas-sleep-paywall",
  { annual: 50, quarterly: 50 },
  { annual: AnnualPaywall, quarterly: QuarterlyPaywall },
);
```

The runtime calls `assignVariant(experiment, sessionId, existingAssignment)` and saves the result in `session.assignments`. Render the selected variant using that assignment. Carry the assignments through every event and checkout request.

Change one decision at a time: opening promise, question order, proof, result framing, plan presentation, price framing, or CTA language. Define success, guardrails, audience, and decision window before rollout. Keep a control path until the result is understood.

## Build screens that feel finished

Use this review pass after the flow works:

1. Open every screen at 360px, 768px, and a wide desktop viewport.
2. Confirm the primary action stays visible without horizontal scrolling and works by keyboard.
3. Check visual states: initial, hover, focus-visible, active, selected, disabled, validation error, loading, and asynchronous checkout error.
4. Replace generic copy with product-specific promise, proof, and CTA language.
5. Verify that headings, contrast, tap targets, images, and legal copy remain readable on a real mobile device.
6. Walk each branch with a fresh session and a resumed local session.
7. Verify that the paywall’s displayed offer, configured offer, and checkout argument match exactly.

Treat screen count as a consequence of clarity. Every screen should create clarity, commitment, personalization, or trust.

## Validate before handoff

Run the repository checks after any funnel change:

```bash
pnpm validate
pnpm test
pnpm build
```

In a large workspace, run the relevant app build if the root build is outside the task’s scope. Also manually verify:

- Host and `/f/<funnel-id>` routing choose the intended funnel.
- A new session starts at the intended first screen and a saved session restores safely.
- All static and dynamic routes resolve to existing screen IDs.
- Question answers appear in session state before their dependent route or result uses them.
- Events use canonical names and carry the expected funnel, screen, session, assignment, and attribution context.
- Mock checkout works with empty local secrets; real checkout stays behind server-side production configuration.
- Stripe webhook verification and subscription delivery stay operational after product or offer changes.

## Delivery checklist

Before calling the funnel complete, confirm the following:

- The funnel has a concise, evidence-backed promise and a visible audience fit.
- Every screen has a semantic type, unique stable ID, and a clear primary action.
- Product configuration holds domains, branding, offer labels, amounts, currencies, and environment-backed Stripe price IDs.
- Reusable work is exported and registered only when it has a genuine second consumer.
- Browser source emits canonical events through shared helpers.
- Attribution, experiment assignments, session ID, and offer ID survive checkout.
- Provider secrets and backend targets remain server-side.
- The complete mobile journey, all branches, checkout fallback, and confirmation path have been exercised.
- Validation, tests, and the relevant build pass.

## Repository reference

The reference implementation is intentionally small and is the primary source for current SDK behavior:

- `packages/funnel-runtime/src/index.ts` — definitions, sessions, validation, and navigation.
- `packages/funnel-components/src/index.tsx` — shared visual primitives.
- `packages/funnel-patterns/src/index.ts` — reusable answer-field sequences.
- `packages/registry/src/index.ts` — reusable asset catalogue.
- `packages/analytics/src/index.ts` — canonical event schema and provider adapters.
- `packages/attribution/src/index.ts` — first/current touch capture.
- `packages/experiments/src/index.ts` — deterministic session assignment.
- `packages/payments/src/index.ts` — checkout request and metadata contract.
- `apps/web/funnels/catalog.tsx` — composed funnels, shared screens, and paywall experiment.
- `apps/web/components/funnel-app.tsx` — session persistence and lifecycle integration.
- `apps/web/lib/products.ts` — product and offer configuration.
- `apps/web/app/api` — tracking, checkout, and verified payment delivery.
