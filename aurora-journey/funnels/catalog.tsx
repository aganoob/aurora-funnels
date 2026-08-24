"use client";
import { PrimaryButton } from "@aganoob/components";
import { defineFunnel, defineScreen, type FunnelDefinition, type ScreenProps } from "@aganoob/core";

function Welcome({ next }: ScreenProps) { return <section><p>Welcome</p><h1>Build your plan.</h1><PrimaryButton onClick={next}>Start</PrimaryButton></section>; }
function Paywall({ checkout }: ScreenProps) { return <section className="card"><h2>Your membership</h2><PrimaryButton onClick={() => void checkout("annual")}>Start annual plan</PrimaryButton></section>; }
function Success() { return <section><h1>You’re all set.</h1></section>; }

export const auroraJourney = defineFunnel({ id: "aurora-journey", productId: "aurora-journey", domains: ["aurora-journey.localhost"], defaultOffer: "annual", screens: [defineScreen({ id: "welcome", type: "landing", component: Welcome }), defineScreen({ id: "paywall", type: "paywall", component: Paywall, conversion: "subscription_started" }), defineScreen({ id: "success", type: "success", component: Success })] });

export const funnels: Record<string, FunnelDefinition> = { "aurora-journey": auroraJourney };
export const defaultFunnelId = "aurora-journey";
// shipflow:add-import
// shipflow:add-funnel
