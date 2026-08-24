"use client";

import { useEffect, useState, type ReactNode } from "react";
import { defineFunnel, defineScreen, type FunnelDefinition, type ScreenProps } from "@aganoob/core";

type Choice = { label: string; value?: string };

function FlowHeader({ progress, previous }: { progress: number; previous: () => void }) {
  return <header className="aurora-flow-header">
    <button className="aurora-icon-button" aria-label="Go back" onClick={previous}>‹</button>
    <div className="aurora-progress" aria-label={`${progress}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div>
    <span className="aurora-wordmark" aria-label="Aurora">A</span>
  </header>;
}

function Emphasis({ children }: { children: ReactNode }) { return <span className="aurora-accent">{children}</span>; }

function Question({
  title, detail, choices, field, progress, multi = false, cta = "Continue", previous, next, setAnswer, session,
}: {
  title: ReactNode; detail?: string; choices: Choice[]; field: string; progress: number; multi?: boolean; cta?: string;
  previous: () => void; next: () => void; setAnswer: ScreenProps["setAnswer"]; session: ScreenProps["session"];
}) {
  const saved = String(session.answers[field] ?? "");
  const [selected, setSelected] = useState<string[]>(() => saved ? saved.split("|") : []);
  const update = (choice: Choice) => {
    const value = choice.value ?? choice.label;
    const values = multi ? (selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]) : [value];
    setSelected(values);
    setAnswer(field, values.join("|"));
  };
  return <section className="aurora-screen aurora-question">
    <FlowHeader progress={progress} previous={previous} />
    <div className="aurora-question-copy"><h1>{title}</h1>{detail && <p>{detail}</p>}</div>
    <div className="aurora-options">
      {choices.map((choice) => {
        const value = choice.value ?? choice.label;
        const active = selected.includes(value);
        return <button className={`aurora-option ${active ? "is-selected" : ""}`} key={value} onClick={() => update(choice)}><span>{choice.label}</span><i className={multi ? "aurora-check" : "aurora-radio"}>{active && "✓"}</i></button>;
      })}
    </div>
    <button className="aurora-bottom-button" disabled={!selected.length} onClick={next}>{cta}</button>
  </section>;
}

function Pitch({ title, body, progress, visual = "dishes", previous, next }: { title: ReactNode; body?: string; progress: number; visual?: "dishes" | "variety" | "organise" | "healthy"; previous: () => void; next: () => void }) {
  return <section className="aurora-screen aurora-pitch">
    <FlowHeader progress={progress} previous={previous} /><h1>{title}</h1>{body && <p>{body}</p>}
    <div className={`aurora-visual aurora-visual-${visual}`}>
      {visual === "dishes" && <><span>🍜</span><span>🌮</span><span>🥗</span><span>🍛</span><span>🍳</span><span>🥙</span></>}
      {visual === "variety" && <><div className="aurora-chef">👩🏻‍🍳</div><div className="aurora-dish-small">🍲</div><div className="aurora-dish-small">🥬</div></>}
      {visual === "organise" && <div className="aurora-shopping-card"><strong>Shopping list (23)</strong><span>🧄 1 Bulb Garlic <b>✓</b></span><span>🍌 4 Plantain</span><span>🥫 50g Kimchi</span></div>}
      {visual === "healthy" && <div className="aurora-recipe-card"><b>💪 High protein</b><span>🍳</span><small>41g Protein　 6g Fibre　 28g Carb　 371 kcal</small></div>}
    </div>
    {visual === "variety" && <h2>New recipes dropped every week (5000+ and counting).</h2>}{visual === "organise" && <h2>Pick recipes, Aurora builds your shopping list.</h2>}
    <button className="aurora-bottom-button" onClick={next}>Continue</button>
  </section>;
}

function SocialProof({ previous, next }: ScreenProps) { return <section className="aurora-screen aurora-social-proof"><FlowHeader progress={12} previous={previous} /><h1>Join <Emphasis>4 million</Emphasis> home cooks eating delicious food, every day of the week.</h1><div className="aurora-awards"><div>❮❮　<strong>4.8 ★★★★★</strong>　❯❯<small> App Store</small></div><div>❮❮　<strong>App of the Day</strong>　❯❯<small> App Store</small></div><div>❮❮　<strong>Recipes featured</strong>　❯❯<small>▰ App News</small></div></div><button className="aurora-bottom-button" onClick={next}>Show me how</button></section>; }

function Testimonials({ previous, next }: ScreenProps) { const quotes = [["Aurora has been an absolute game changer. I have cooked at least 15 recipes in the last month and they are all soooo good.", "JH, Trustpilot (2026)"], ["Love the meal planning function. What used to take me an hour every week now takes me less than 5 mins.", "Emma, Trustpilot (2026)"]]; return <section className="aurora-screen aurora-testimonials"><FlowHeader progress={38} previous={previous} /><h1>Thanks for sharing</h1><p>Aurora is built for home cooks like you. Here’s what the Aurora community have to say.</p><div className="aurora-quote-list">{quotes.map(([quote, author]) => <article key={author}><strong>★★★★★</strong><p>“{quote}”</p><small>{author}</small></article>)}</div><button className="aurora-bottom-button" onClick={next}>Continue</button></section>; }

function Loader({ next }: ScreenProps) { useEffect(() => { const id = window.setTimeout(next, 1250); return () => window.clearTimeout(id); }, [next]); return <section className="aurora-screen aurora-loader" aria-live="polite"><div className="aurora-loader-progress"><i /></div><p className="aurora-eyebrow">Your recipe profile</p><h1>Building your<br /><Emphasis>perfect week...</Emphasis></h1><div className="aurora-loader-dishes" aria-hidden="true">🍝　🥘　🥗</div><p>Matching tasty recipes to your answers</p></section>; }
function Splash({ next }: ScreenProps) { return <section className="aurora-screen aurora-splash"><div className="aurora-splash-copy"><p className="aurora-eyebrow">Aurora meal planning</p><h1>Make weeknight cooking feel <Emphasis>easy</Emphasis> again.</h1><p>Answer a few quick questions and get a recipe plan built around your real week.</p></div><div className="aurora-week-preview" aria-label="A preview of an Aurora weekly meal plan"><div><span>Mon</span><b>15 min noodle bowl</b><i>🍜</i></div><div><span>Tue</span><b>One-pan harissa chicken</b><i>🍗</i></div><div><span>Wed</span><b>Speedy green pasta</b><i>🥬</i></div></div><button className="aurora-bottom-button" onClick={next}>Build my weekly plan <span aria-hidden="true">→</span></button><small>Personalised recipes in about 2 minutes</small></section>; }
function Account({ previous, next, setAnswer, session }: ScreenProps) {
  const [email, setEmail] = useState(String(session.answers.email ?? ""));
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const updateEmail = (value: string) => { setEmail(value); setAnswer("email", value); };
  return <section className="aurora-screen aurora-account">
    <FlowHeader progress={84} previous={previous} />
    <h1>Where should we send your plan?</h1>
    <p>Enter your email to save your tailored recipes and pick up where you left off.</p>
    <label className="aurora-email-label" htmlFor="email">Email address</label>
    <input className="aurora-email-input" id="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => updateEmail(event.target.value)} />
    <button className="aurora-bottom-button" disabled={!validEmail} onClick={next}>Continue</button>
  </section>;
}
function Details({ previous, next, setAnswer, session }: ScreenProps) { const [diet, setDiet] = useState(String(session.answers.diet ?? "")); const [dob, setDob] = useState(String(session.answers.dob ?? "")); const saveDiet = (value: string) => { setDiet(value); setAnswer("diet", value); }; const updateDob = (value: string) => { setDob(value); setAnswer("dob", value); }; return <section className="aurora-screen aurora-details"><FlowHeader progress={90} previous={previous} /><h1>Tell us about you</h1><p>We’ll tailor recipes to your dietary needs.</p><h2>Any dietary requirements?<small>Select one.</small></h2><div className="aurora-options">{["None", "Vegan", "Veggie", "Pescatarian", "Prefer not to say"].map((item) => <button className={`aurora-option ${diet === item ? "is-selected" : ""}`} key={item} onClick={() => saveDiet(item)}><span>{item}</span><i className="aurora-radio">{diet === item && "✓"}</i></button>)}</div><label className="aurora-dob">Date of birth<input aria-label="Date of birth" type="date" value={dob} onChange={(e) => updateDob(e.target.value)} /></label><button className="aurora-bottom-button" disabled={!diet || !dob} onClick={next}>Continue</button></section>; }
function PlanPreview({ next, previous, session }: ScreenProps) {
  const meals = String(session.answers.meals ?? "");
  const goals = String(session.answers.goals ?? "");
  const mealFocus = meals.includes("Speedy") ? "speedy weeknight dinners" : meals.includes("Cook-ahead") ? "cook-ahead favourites" : "flexible, feel-good meals";
  const goalFocus = goals.includes("Healthier") ? "more nourishing choices" : goals.includes("organised") ? "a calmer, more organised week" : "more variety on repeat";
  return <section className="aurora-screen aurora-plan-preview"><FlowHeader progress={82} previous={previous} /><p className="aurora-eyebrow">Your starting point</p><h1>Your week is taking <Emphasis>shape.</Emphasis></h1><p>We’ve picked a practical starting point for {mealFocus}, with {goalFocus}.</p><div className="aurora-plan-card"><div className="aurora-plan-card-top"><span>This week’s edit</span><strong>3 dinners + smart leftovers</strong></div><ol><li><b>Monday</b><span>Fast, low-fuss dinner</span><i>20 min</i></li><li><b>Wednesday</b><span>Flavour-packed midweek meal</span><i>30 min</i></li><li><b>Friday</b><span>Flexible finish to the week</span><i>25 min</i></li></ol></div><p className="aurora-plan-note">Your membership unlocks the full plan, shopping lists, and fresh recipe ideas every week.</p><button className="aurora-bottom-button" onClick={next}>See my membership</button></section>;
}
function Paywall({ checkout, previous }: ScreenProps) { const [isCheckingOut, setIsCheckingOut] = useState(false); const [error, setError] = useState(""); const startCheckout = async () => { setError(""); setIsCheckingOut(true); try { await checkout("annual"); } catch { setError("We couldn’t open checkout. Please try again."); setIsCheckingOut(false); } }; return <section className="aurora-screen aurora-paywall"><FlowHeader progress={96} previous={previous} /><p className="aurora-eyebrow">Your Aurora membership</p><h1>Make every week easier to <Emphasis>cook.</Emphasis></h1><p>Get a plan that fits your week, fresh recipe ideas, and a shopping list that builds itself.</p><div className="aurora-price-card"><span>Annual membership</span><strong>£34.99 <small>per year</small></strong><p>Try Aurora free for 5 days.</p></div><ul><li>Recipes matched to how you like to cook</li><li>One-tap shopping lists and saved favourites</li><li>New ideas whenever your routine changes</li></ul><article><strong>★★★★★</strong><p>“It’s so easy to use with so many great, healthy recipes. I use it all the time, and recommend it to friends!”</p><small>Elemsee</small></article><div className="aurora-paywall-bottom"><p>No payment today. Cancel anytime before your trial ends.</p>{error && <p className="aurora-checkout-error" role="alert">{error}</p>}<button className="aurora-bottom-button" disabled={isCheckingOut} onClick={() => void startCheckout()}>{isCheckingOut ? "Opening checkout…" : "Start my 5-day free trial"}</button><small>Then £34.99 per year (£2.92/month, billed annually)</small></div></section>; }

const question = (config: Omit<Parameters<typeof Question>[0], "previous" | "next" | "setAnswer" | "session">) => (props: ScreenProps) => <Question {...config} {...props} />;
const pitch = (config: Omit<Parameters<typeof Pitch>[0], "previous" | "next">) => (props: ScreenProps) => <Pitch {...config} {...props} />;
const choices = (items: string[]) => items.map((label) => ({ label }));
const household = question({ field: "household", progress: 6, title: <>Who are you <Emphasis>cooking</Emphasis> for during the week?</>, choices: [{ label: "👤  Just Myself" }, { label: "🧑‍🤝‍🧑  Partner or Spouse" }, { label: "👪  Family with kids", value: "Family with kids" }, { label: "🏠  Housemates" }, { label: "👥  A mix of people" }] });
const kids = question({ field: "kids", progress: 15, multi: true, cta: "Next", title: <>How old are the <Emphasis>kids</Emphasis> in your household?</>, detail: "Select all that apply", choices: choices(["0-1 years old", "2-4 years old", "5-12 years old", "13-16 years old", "17+ years old"]) });
const cooking = question({ field: "cooking", progress: 26, title: <>First off, how’s <Emphasis>cooking</Emphasis> been for you recently?</>, choices: choices(["🔥  I'm on a roll, want more inspo", "🙂  It's fine, but a bit samey", "😐  I'm stuck in a rut", "😫  It's a chore, honestly", "🙃  I'm hardly cooking at all"]) });
const time = question({ field: "time", progress: 32, title: <>How much <Emphasis>time</Emphasis> do you have on weeknight evenings?</>, choices: choices(["🔋  Literally none", "🤷  It's unpredictable", "⏱️  Under 20 minutes", "⏰  Under 30 minutes", "🕐  Up to an hour"]) });
const goals = question({ field: "goals", progress: 45, multi: true, title: <>What would make <Emphasis>midweek</Emphasis> meals better?</>, detail: "Pick as many as you like.", choices: choices(["🔥  More variety", "🧘  Feeling organised (with less effort)", "💚  Healthier food"]) });
const organised = question({ field: "organised", progress: 58, multi: true, title: <>What would a more <Emphasis>organised</Emphasis> week look like for you?</>, detail: "Pick as many as you like", choices: choices(["📋  More meals planned ahead", "🍲  More meals home-cooked", "💸  Less money spent on takeaways or eating out", "🔪  More meals prepped in advance", "♻️  Less food wasted"]) });
const healthy = question({ field: "healthy", progress: 68, multi: true, title: <>What does eating <Emphasis>healthy</Emphasis> mean to you?</>, detail: "Pick anything that fits. We’ll tune your recipe recommendations around it", choices: choices(["💪  More protein", "🥬  More veg", "⚖️  More balanced plate", "🚫  Fewer processed foods"]) });
const meals = question({ field: "meals", progress: 76, multi: true, title: <>What type of meals do you want to <Emphasis>cook</Emphasis>?</>, detail: "Pick as many as you like – we've got them all.", choices: choices(["⏱️  Speedy weeknight dinners", "🍲  Cook-ahead dinners", "🥗  Packed lunches", "🥣  Preppable breakfasts"]) });

export const auroraJourney = defineFunnel({ id: "aurora-journey", productId: "aurora-journey", domains: ["aurora-journey.localhost"], defaultOffer: "annual", screens: [
  defineScreen({ id: "splash", type: "landing", component: Splash }),
  defineScreen({ id: "household", type: "quiz_question", component: household, next: (session) => session.answers.household === "Family with kids" ? "kids" : "social-proof" }),
  defineScreen({ id: "social-proof", type: "social_proof", component: SocialProof, next: "personal" }), defineScreen({ id: "kids", type: "quiz_question", component: kids, next: "personal" }),
  defineScreen({ id: "personal", type: "content", component: pitch({ progress: 20, title: <>Let's build <Emphasis>your</Emphasis> personalised recipe recommendations.</>, body: "Answer a few quick questions about how you cook and eat, and we'll tailor recommendations to your week." }) }),
  defineScreen({ id: "cooking", type: "quiz_question", component: cooking }), defineScreen({ id: "time", type: "quiz_question", component: time }), defineScreen({ id: "testimonials", type: "social_proof", component: Testimonials }), defineScreen({ id: "goals", type: "quiz_question", component: goals }),
  defineScreen({ id: "variety", type: "content", component: pitch({ progress: 52, visual: "variety", title: <>More <Emphasis>variety:</Emphasis> mix up your weekly rotation.</> }) }), defineScreen({ id: "organised", type: "quiz_question", component: organised }), defineScreen({ id: "organised-benefit", type: "content", component: pitch({ progress: 64, visual: "organise", title: <>Aurora <Emphasis>organises</Emphasis> everything, so you can just enjoy cooking.</> }) }),
  defineScreen({ id: "healthy", type: "quiz_question", component: healthy }), defineScreen({ id: "healthy-benefit", type: "content", component: pitch({ progress: 72, visual: "healthy", title: <>Healthy recipes. No compromise on <Emphasis>flavour.</Emphasis></>, body: "Macros on every recipe. Filter by protein, calories, and ingredients to either include or avoid." }) }), defineScreen({ id: "meals", type: "quiz_question", component: meals }), defineScreen({ id: "loader", type: "loader", component: Loader }), defineScreen({ id: "plan-preview", type: "result", component: PlanPreview }), defineScreen({ id: "account", type: "email_capture", component: Account }), defineScreen({ id: "details", type: "quiz_question", component: Details }), defineScreen({ id: "paywall", type: "paywall", component: Paywall, conversion: "subscription_started" }), defineScreen({ id: "success", type: "success", component: () => <section className="aurora-screen aurora-success"><h1>Your kitchen is ready.</h1><p>Thanks for starting your trial.</p></section> }),
] });

export const funnels: Record<string, FunnelDefinition> = { "aurora-journey": auroraJourney };
export const defaultFunnelId = "aurora-journey";
