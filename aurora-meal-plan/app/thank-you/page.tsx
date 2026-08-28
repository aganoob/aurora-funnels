import Link from "next/link";

export default function ThankYouPage() {
  return (
    <main className="aurora-thank-you">
      <section className="aurora-thank-you-card" aria-labelledby="thank-you-title">
        <span className="aurora-thank-you-mark" aria-hidden="true">✓</span>
        <p className="aurora-eyebrow">You’re all set</p>
        <h1 id="thank-you-title">Thanks for joining Aurora.</h1>
        <p>Your 5-day free trial is active. Your personalised weekly meal plan is on its way to your inbox.</p>
        <Link className="aurora-thank-you-button" href="/">Build another meal plan</Link>
      </section>
    </main>
  );
}
