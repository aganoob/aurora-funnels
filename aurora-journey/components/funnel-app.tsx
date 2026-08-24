"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { captureAttribution, mergeAttribution } from "@aganoob/attribution";
import type { EventContext } from "@aganoob/analytics";
import { createSession, nextScreenId } from "@aganoob/core";
import { createCheckout } from "@aganoob/payments";
import { defaultFunnelId, funnels } from "../funnels/catalog";
import { browserAnalytics } from "../lib/analytics-browser";

export function FunnelApp({ funnelId = defaultFunnelId }: { funnelId?: string }) {
  const funnel = funnels[funnelId] ?? funnels[defaultFunnelId];
  const [session, setSession] = useState(() => createSession());
  const [screenId, setScreenId] = useState(funnel.screens[0].id);
  const [history, setHistory] = useState<string[]>([]);
  const hasViewedFunnel = useRef(false);
  const viewedScreens = useRef(new Set<string>());
  const current = funnel.screens.find((screen) => screen.id === screenId) ?? funnel.screens[0];
  const context = useMemo<EventContext>(() => { const touch = typeof window === "undefined" ? {} : captureAttribution(new URL(window.location.href), document.referrer); const attribution = mergeAttribution(touch, touch); return { eventId: crypto.randomUUID(), productId: funnel.productId, funnelId: funnel.id, funnelVersion: "local", sessionId: session.sessionId, screenId: current.id, screenType: current.type, assignments: session.assignments, attribution }; }, [current.id, current.type, funnel, session]);
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
  const checkout = async (offerId: string) => { await browserAnalytics.track("offer_selected", { ...context, eventId: crypto.randomUUID() }, { offer_id: offerId }); await browserAnalytics.track("checkout_started", { ...context, eventId: crypto.randomUUID() }, { offer_id: offerId }); const result = await createCheckout({ funnelId: funnel.id, productId: funnel.productId, offerId, sessionId: session.sessionId, assignments: session.assignments, attribution: context.attribution }); window.location.assign(result.url); };
  const Screen = current.component;
  const previous = () => { const prior = history.at(-1); if (prior) { setHistory((visited) => visited.slice(0, -1)); setScreenId(prior); } };
  const setAnswer = (field: string, value: string | number | boolean) => {
    setSession((saved) => ({ ...saved, answers: { ...saved.answers, [field]: value } }));
    if (current.type === "quiz_question" && field !== "dob") void browserAnalytics.track("quiz_question_answered", { ...context, eventId: crypto.randomUUID() }, { field, value });
  };
  return <main><Screen session={session} setAnswer={setAnswer} next={next} previous={previous} goTo={setScreenId} checkout={checkout} /></main>;
}
