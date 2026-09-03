"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { captureAttribution, mergeAttribution } from "@aganoob/attribution";
import type { EventContext } from "@aganoob/analytics";
import { createSession, nextScreenId } from "@aganoob/core";
import { createCheckout, getCheckoutOutcome, type CheckoutPresentation } from "@aganoob/payments";
import { defaultFunnelId, funnels } from "../funnels/catalog";
import { browserAnalytics } from "../lib/analytics-browser";
import { ProviderCheckout } from "./provider-checkout";

export function FunnelApp({ funnelId = defaultFunnelId }: { funnelId?: string }) {
  const funnel = funnels[funnelId] ?? funnels[defaultFunnelId];
  const [session, setSession] = useState(() => createSession());
  const [screenId, setScreenId] = useState(funnel.screens[0].id);
  const [history, setHistory] = useState<string[]>([]);
  const [checkoutPresentation, setCheckoutPresentation] = useState<CheckoutPresentation | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const hasViewedFunnel = useRef(false);
  const viewedScreens = useRef(new Set<string>());
  const handledCheckoutReferences = useRef(new Set<string>());
  const current = funnel.screens.find((screen) => screen.id === screenId) ?? funnel.screens[0];
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
  useEffect(() => { browserAnalytics.initBrowser(); }, []);
  useEffect(() => { if (!hasViewedFunnel.current) { hasViewedFunnel.current = true; void browserAnalytics.track("funnel_viewed", { ...context, eventId: crypto.randomUUID() }); } }, [context]);
  useEffect(() => {
    if (viewedScreens.current.has(current.id)) return;
    viewedScreens.current.add(current.id);
    void browserAnalytics.track("screen_viewed", { ...context, eventId: crypto.randomUUID() });
    const viewEvent = current.type === "quiz_question" ? "quiz_question_viewed" : current.type === "email_capture" ? "email_capture_viewed" : current.type === "result" ? "result_viewed" : current.type === "paywall" ? "paywall_viewed" : undefined;
    if (viewEvent) void browserAnalytics.track(viewEvent, { ...context, eventId: crypto.randomUUID() });
  }, [context, current.id, current.type]);
  const next = () => { void browserAnalytics.track("screen_completed", { ...context, eventId: crypto.randomUUID() }); if (current.type === "email_capture") void browserAnalytics.track("email_submitted", { ...context, eventId: crypto.randomUUID() }, { consent: { meta: "denied" } }); const destination = nextScreenId(funnel, current.id, session); if (destination) { setHistory((prior) => [...prior, current.id]); setScreenId(destination); } };
  const settleCheckout = async (reference: string, fallbackOfferId?: string, provider = "stripe") => {
    if (handledCheckoutReferences.current.has(reference)) return;
    handledCheckoutReferences.current.add(reference);
    try {
      const outcome = await getCheckoutOutcome(reference, provider);
      if (outcome.funnelId && outcome.funnelId !== funnel.id) throw new Error("Checkout belongs to a different funnel");
      if (outcome.productId && outcome.productId !== funnel.productId) throw new Error("Checkout belongs to a different product");
      const offerId = outcome.offerId ?? fallbackOfferId;
      if (outcome.status === "paid" || outcome.status === "trialing") {
        await browserAnalytics.track("checkout_completed", { ...context, eventId: crypto.randomUUID(), occurredAt: new Date().toISOString() }, { checkout_session_id: outcome.reference, offer_id: offerId, payment_status: outcome.status, value: outcome.amount, currency: outcome.currency });
        setCheckoutPresentation(null);
        const routes = funnel.checkoutRoutes;
        const destination = offerId ? routes?.[offerId]?.[outcome.status] : undefined;
        if (destination) setScreenId(destination);
        return;
      }
      setCheckoutPresentation(null);
      setCheckoutError(outcome.status === "cancelled" ? "Checkout was cancelled. You can choose a plan whenever you’re ready." : outcome.status === "pending" ? "Your payment is still processing. We’ll update your membership as soon as it completes." : "Your payment was not completed. Please try again.");
    } catch (error) {
      handledCheckoutReferences.current.delete(reference);
      setCheckoutError(error instanceof Error ? error.message : "We couldn’t confirm your checkout.");
    }
  };
  useEffect(() => {
    const url = new URL(window.location.href);
    const checkout = url.searchParams.get("checkout");
    const reference = url.searchParams.get("session_id");
    if ((checkout === "return" || checkout === "mock") && reference) {
      void settleCheckout(reference, url.searchParams.get("offer_id") ?? undefined, url.searchParams.get("provider") ?? "stripe");
      url.searchParams.delete("checkout");
      url.searchParams.delete("session_id");
      url.searchParams.delete("offer_id");
      url.searchParams.delete("provider");
      window.history.replaceState({}, "", url);
    }
    if (checkout === "cancelled") setCheckoutError("Checkout was cancelled. You can choose a plan whenever you’re ready.");
  }, [funnel.id, funnel.productId]);
  const checkout = async (offerId: string) => {
    setCheckoutError(null);
    await browserAnalytics.track("offer_selected", { ...context, eventId: crypto.randomUUID(), occurredAt: new Date().toISOString() }, { offer_id: offerId });
    const result = await createCheckout({ funnelId: funnel.id, productId: funnel.productId, offerId, sessionId: session.sessionId, email: session.identity.email, assignments: session.assignments, attribution: context.attribution, sourceUrl: window.location.href, consent: context.consent });
    await browserAnalytics.track("checkout_started", { ...context, eventId: crypto.randomUUID(), occurredAt: new Date().toISOString() }, { offer_id: offerId, provider: result.provider, checkout_session_id: result.reference });
    if (result.kind === "redirect") {
      window.location.assign(result.url);
      return;
    }
    setCheckoutPresentation(result);
  };
  const Screen = current.component;
  const previous = () => { const prior = history.at(-1); if (prior) { setHistory((visited) => visited.slice(0, -1)); setScreenId(prior); } };
  const setAnswer = (field: string, value: string | number | boolean) => {
    setSession((saved) => ({ ...saved, answers: { ...saved.answers, [field]: value }, identity: field === "email" ? { ...saved.identity, email: String(value) } : saved.identity }));
    if (current.type === "quiz_question" && field !== "dob") void browserAnalytics.track("quiz_question_answered", { ...context, eventId: crypto.randomUUID() }, { field, value });
  };
  const setIdentity = (identity: Partial<typeof session.identity>) => setSession((saved) => ({ ...saved, identity: { ...saved.identity, ...identity } }));
  if (checkoutPresentation?.kind === "embedded") return <main className="aurora-screen"><button className="aurora-icon-button" onClick={() => setCheckoutPresentation(null)}>Back</button><ProviderCheckout presentation={checkoutPresentation} onComplete={() => void settleCheckout(checkoutPresentation.reference, undefined, checkoutPresentation.provider)} /></main>;
  return <main>{checkoutError ? <p className="aurora-checkout-error" role="alert">{checkoutError}</p> : null}<Screen session={session} setAnswer={setAnswer} setIdentity={setIdentity} next={next} previous={previous} goTo={setScreenId} checkout={checkout} /></main>;
}
