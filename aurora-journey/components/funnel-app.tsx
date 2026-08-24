"use client";
import { useMemo, useState } from "react";
import { captureAttribution, mergeAttribution } from "@aganoob/attribution";
import { initBrowserProviders, track, type EventContext } from "@aganoob/analytics";
import { createSession, nextScreenId } from "@aganoob/core";
import { createCheckout } from "@aganoob/payments";
import { defaultFunnelId, funnels } from "../funnels/catalog";

export function FunnelApp({ funnelId = defaultFunnelId }: { funnelId?: string }) {
  const funnel = funnels[funnelId] ?? funnels[defaultFunnelId];
  const [session, setSession] = useState(() => createSession());
  const [screenId, setScreenId] = useState(funnel.screens[0].id);
  const current = funnel.screens.find((screen) => screen.id === screenId) ?? funnel.screens[0];
  const context = useMemo<EventContext>(() => { const touch = typeof window === "undefined" ? {} : captureAttribution(new URL(window.location.href), document.referrer); const attribution = mergeAttribution(touch, touch); return { eventId: crypto.randomUUID(), productId: funnel.productId, funnelId: funnel.id, funnelVersion: "local", sessionId: session.sessionId, screenId: current.id, screenType: current.type, assignments: session.assignments, attribution }; }, [current.id, current.type, funnel, session]);
  const next = () => { void track("screen_completed", { ...context, eventId: crypto.randomUUID() }); const destination = nextScreenId(funnel, current.id, session); if (destination) setScreenId(destination); };
  const checkout = async (offerId: string) => { await track("checkout_started", { ...context, eventId: crypto.randomUUID() }, { offer_id: offerId }); const result = await createCheckout({ funnelId: funnel.id, productId: funnel.productId, offerId, sessionId: session.sessionId, assignments: session.assignments, attribution: context.attribution }); window.location.assign(result.url); };
  const Screen = current.component;
  const currentIndex = funnel.screens.findIndex((screen) => screen.id === current.id);
  const previous = () => { const prior = funnel.screens[currentIndex - 1]; if (prior) setScreenId(prior.id); };
  if (typeof window !== "undefined") initBrowserProviders();
  return <main><Screen session={session} setAnswer={(field, value) => setSession((saved) => ({ ...saved, answers: { ...saved.answers, [field]: value } }))} next={next} previous={previous} goTo={setScreenId} checkout={checkout} /></main>;
}
