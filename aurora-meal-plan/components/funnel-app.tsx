"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { captureAttribution, mergeAttribution } from "@aganoob/attribution";
import type { EventContext } from "@aganoob/analytics";
import { createSession, nextScreenId, type FunnelSession } from "@aganoob/core";
import { createCheckout, getCheckoutOutcome, type CheckoutInput, type CheckoutOutcome, type CheckoutPresentation } from "@aganoob/payments";
import { defaultFunnelId, funnels } from "../funnels/catalog";
import { browserAnalytics } from "../lib/analytics-browser";
import { ProviderCheckout } from "./provider-checkout";

export type PaymentResultRoute = "payment-success" | "payment-failed";

type AuroraCheckoutOutcome = CheckoutOutcome & { funnelSessionId?: string };
type CheckoutState = "idle" | "checking" | "pending";
type CheckoutAttemptInput = CheckoutInput & { checkoutAttemptId: string };

function sessionStorageKey(funnelId: string) {
  return `shipflow:session:${funnelId}`;
}

function savedSession(funnelId: string): FunnelSession {
  if (typeof window === "undefined") return createSession();
  try {
    const value = JSON.parse(window.sessionStorage.getItem(sessionStorageKey(funnelId)) ?? "null") as Partial<FunnelSession> | null;
    if (value && typeof value.sessionId === "string" && value.sessionId && value.answers && value.identity && value.assignments && typeof value.startedAt === "string" && typeof value.updatedAt === "string") return value as FunnelSession;
  } catch {}
  return createSession();
}

function resultUrl(funnelId: string, result: PaymentResultRoute, reference?: string, sessionId?: string) {
  const url = new URL(`/f/${encodeURIComponent(funnelId)}/${result}`, window.location.origin);
  if (reference) url.searchParams.set("checkout_session_id", reference);
  if (sessionId) url.searchParams.set("funnel_session_id", sessionId);
  return `${url.pathname}${url.search}`;
}

function PaymentProcessing({ onCheck }: { onCheck: () => void }) {
  return <main className="aurora-screen aurora-payment-result" aria-live="polite"><span className="aurora-payment-mark" aria-hidden="true">…</span><p className="aurora-eyebrow">Payment processing</p><h1>We’re confirming your payment.</h1><p>Your membership will be ready as soon as Stripe confirms the result.</p><button className="aurora-payment-button" onClick={onCheck}>Check payment status</button></main>;
}

export function FunnelApp({ funnelId = defaultFunnelId, paymentResult }: { funnelId?: string; paymentResult?: PaymentResultRoute }) {
  const funnel = funnels[funnelId] ?? funnels[defaultFunnelId];
  const [session, setSession] = useState(() => savedSession(funnel.id));
  const [screenId, setScreenId] = useState(funnel.screens[0].id);
  const [history, setHistory] = useState<string[]>([]);
  const [checkoutPresentation, setCheckoutPresentation] = useState<CheckoutPresentation | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>(paymentResult ? "checking" : "idle");
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const hasViewedFunnel = useRef(false);
  const viewedScreens = useRef(new Set<string>());
  const completedCheckoutReferences = useRef(new Set<string>());
  const completedFunnels = useRef(new Set<string>());
  const current = funnel.screens.find((screen) => screen.id === screenId) ?? funnel.screens[0];
  const isCheckingResult = Boolean(paymentResult && checkoutState === "checking");
  const attribution = useMemo(() => {
    const currentTouch = typeof window === "undefined" ? {} : captureAttribution(new URL(window.location.href), document.referrer);
    if (typeof window === "undefined") return mergeAttribution(currentTouch, currentTouch);
    const storageKey = `shipflow:attribution:${funnel.id}`;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Partial<EventContext["attribution"]>;
      const merged = mergeAttribution(saved.firstTouch ?? currentTouch, currentTouch);
      window.localStorage.setItem(storageKey, JSON.stringify(merged));
      return merged;
    } catch { return mergeAttribution(currentTouch, currentTouch); }
  }, [funnel.id]);
  const context = useMemo<EventContext>(() => ({ eventId: crypto.randomUUID(), occurredAt: new Date().toISOString(), productId: funnel.productId, funnelId: funnel.id, funnelVersion: "local", sessionId: session.sessionId, screenId: current.id, screenType: current.type, assignments: session.assignments, attribution, sourceUrl: typeof window === "undefined" ? undefined : window.location.href, referrer: typeof document === "undefined" ? undefined : document.referrer, identity: session.identity, consent: { meta: "granted" } }), [attribution, current.id, current.type, funnel, session]);

  const restoreSessionId = (sessionId?: string) => {
    if (!sessionId) return;
    setSession((saved) => saved.sessionId === sessionId ? saved : { ...saved, sessionId, updatedAt: new Date().toISOString() });
  };
  const navigateToResult = (result: PaymentResultRoute, reference?: string, sessionId?: string) => {
    window.location.replace(resultUrl(funnel.id, result, reference, sessionId));
  };
  const destinationFor = (status: CheckoutOutcome["status"], offerId?: string) => offerId ? funnel.checkoutRoutes?.[offerId]?.[status] : undefined;
  const settleCheckout = async (reference: string, fallbackOfferId?: string, provider = "stripe", fallbackSessionId?: string) => {
    setCheckoutState("checking");
    try {
      const outcome = await getCheckoutOutcome(reference, provider) as AuroraCheckoutOutcome;
      if (outcome.funnelId && outcome.funnelId !== funnel.id) throw new Error("Checkout belongs to a different funnel");
      if (outcome.productId && outcome.productId !== funnel.productId) throw new Error("Checkout belongs to a different product");
      const recoveredSessionId = outcome.funnelSessionId ?? fallbackSessionId ?? session.sessionId;
      restoreSessionId(recoveredSessionId);
      const offerId = outcome.offerId ?? fallbackOfferId;
      if (outcome.status === "paid" || outcome.status === "trialing") {
        if (!completedCheckoutReferences.current.has(outcome.reference)) {
          completedCheckoutReferences.current.add(outcome.reference);
          await browserAnalytics.track("checkout_completed", { ...context, sessionId: recoveredSessionId, eventId: crypto.randomUUID(), occurredAt: new Date().toISOString() }, { checkout_session_id: outcome.reference, offer_id: offerId, payment_status: outcome.status, value: outcome.amount, currency: outcome.currency });
        }
      }
      const destination = destinationFor(outcome.status, offerId);
      if (destination === "payment-success" || destination === "payment-failed") {
        const route = destination as PaymentResultRoute;
        setCheckoutPresentation(null);
        setCheckoutError(null);
        if (paymentResult !== route) {
          navigateToResult(route, outcome.reference, recoveredSessionId);
          return;
        }
        setScreenId(destination);
        setCheckoutState("idle");
        return;
      }
      if (outcome.status === "pending") {
        setCheckoutPresentation(null);
        setPendingReference(outcome.reference);
        setCheckoutState("pending");
        return;
      }
      throw new Error("We couldn’t determine your payment result.");
    } catch (error) {
      setCheckoutPresentation(null);
      setCheckoutState("idle");
      setCheckoutError(error instanceof Error ? error.message : "We couldn’t confirm your checkout.");
      if (paymentResult === "payment-success") setScreenId("payment-failed");
    }
  };

  useEffect(() => {
    try { window.sessionStorage.setItem(sessionStorageKey(funnel.id), JSON.stringify(session)); } catch {}
  }, [funnel.id, session]);
  useEffect(() => { browserAnalytics.initBrowser(); }, []);
  useEffect(() => { if (!hasViewedFunnel.current) { hasViewedFunnel.current = true; void browserAnalytics.track("funnel_viewed", { ...context, eventId: crypto.randomUUID() }); } }, [context]);
  useEffect(() => {
    if (isCheckingResult || viewedScreens.current.has(current.id)) return;
    viewedScreens.current.add(current.id);
    void browserAnalytics.track("screen_viewed", { ...context, eventId: crypto.randomUUID() });
    const viewEvent = current.type === "quiz_question" ? "quiz_question_viewed" : current.type === "email_capture" ? "email_capture_viewed" : current.type === "result" ? "result_viewed" : current.type === "paywall" ? "paywall_viewed" : undefined;
    if (viewEvent) void browserAnalytics.track(viewEvent, { ...context, eventId: crypto.randomUUID() });
  }, [context, current.id, current.type, isCheckingResult]);
  useEffect(() => {
    if (current.type !== "success" || completedFunnels.current.has(current.id)) return;
    completedFunnels.current.add(current.id);
    void browserAnalytics.track("funnel_completed", { ...context, eventId: crypto.randomUUID() });
  }, [context, current.id, current.type]);
  useEffect(() => {
    const url = new URL(window.location.href);
    const reference = url.searchParams.get("checkout_session_id");
    const fallbackSessionId = url.searchParams.get("funnel_session_id") ?? undefined;
    const fallbackOfferId = url.searchParams.get("offer_id") ?? undefined;
    if (paymentResult === "payment-success") {
      if (!reference) { window.location.replace(`/f/${encodeURIComponent(funnel.id)}`); return; }
      void settleCheckout(reference, fallbackOfferId, "stripe", fallbackSessionId);
      return;
    }
    if (paymentResult === "payment-failed") {
      if (reference) { void settleCheckout(reference, fallbackOfferId, "stripe", fallbackSessionId); return; }
      if (fallbackSessionId) { restoreSessionId(fallbackSessionId); setScreenId("payment-failed"); setCheckoutState("idle"); return; }
      window.location.replace(`/f/${encodeURIComponent(funnel.id)}`);
      return;
    }
    const checkout = url.searchParams.get("checkout");
    const legacyReference = url.searchParams.get("session_id");
    if ((checkout === "return" || checkout === "mock") && legacyReference) void settleCheckout(legacyReference, url.searchParams.get("offer_id") ?? undefined, url.searchParams.get("provider") ?? "stripe");
    if (checkout === "cancelled") navigateToResult("payment-failed", undefined, session.sessionId);
  }, [funnel.id, funnel.productId, paymentResult]);

  const next = () => { void browserAnalytics.track("screen_completed", { ...context, eventId: crypto.randomUUID() }); if (current.type === "email_capture") void browserAnalytics.track("email_submitted", { ...context, eventId: crypto.randomUUID() }, { consent: { meta: "denied" } }); const destination = nextScreenId(funnel, current.id, session); if (destination) { setHistory((prior) => [...prior, current.id]); setScreenId(destination); } };
  const checkout = async (offerId: string) => {
    setCheckoutError(null);
    await browserAnalytics.track("offer_selected", { ...context, eventId: crypto.randomUUID(), occurredAt: new Date().toISOString() }, { offer_id: offerId });
    const input: CheckoutAttemptInput = { funnelId: funnel.id, productId: funnel.productId, offerId, sessionId: session.sessionId, email: session.identity.email, assignments: session.assignments, attribution: context.attribution, sourceUrl: window.location.href, consent: context.consent, checkoutAttemptId: crypto.randomUUID() };
    const result = await createCheckout(input);
    await browserAnalytics.track("checkout_started", { ...context, eventId: crypto.randomUUID(), occurredAt: new Date().toISOString() }, { offer_id: offerId, provider: result.provider, checkout_session_id: result.reference });
    if (result.kind === "redirect") { window.location.assign(result.url); return; }
    setCheckoutPresentation(result);
  };
  const previous = () => { const prior = history.at(-1); if (prior) { setHistory((visited) => visited.slice(0, -1)); setScreenId(prior); } };
  const setAnswer = (field: string, value: string | number | boolean) => {
    setSession((saved) => ({ ...saved, answers: { ...saved.answers, [field]: value }, identity: field === "email" ? { ...saved.identity, email: String(value) } : saved.identity, updatedAt: new Date().toISOString() }));
    if (current.type === "quiz_question" && field !== "dob") void browserAnalytics.track("quiz_question_answered", { ...context, eventId: crypto.randomUUID() }, { field, value });
  };
  const setIdentity = (identity: Partial<typeof session.identity>) => setSession((saved) => ({ ...saved, identity: { ...saved.identity, ...identity }, updatedAt: new Date().toISOString() }));

  if (checkoutPresentation?.kind === "embedded") return <main className="aurora-screen"><button className="aurora-icon-button" onClick={() => navigateToResult("payment-failed", checkoutPresentation.reference, session.sessionId)}>Back</button><ProviderCheckout presentation={checkoutPresentation} onComplete={() => navigateToResult("payment-success", checkoutPresentation.reference, session.sessionId)} /></main>;
  if (isCheckingResult || checkoutState === "pending") return <PaymentProcessing onCheck={() => pendingReference && void settleCheckout(pendingReference)} />;
  const Screen = current.component;
  return <main>{checkoutError ? <p className="aurora-checkout-error" role="alert">{checkoutError}</p> : null}<Screen session={session} setAnswer={setAnswer} setIdentity={setIdentity} next={next} previous={previous} goTo={setScreenId} checkout={checkout} /></main>;
}
