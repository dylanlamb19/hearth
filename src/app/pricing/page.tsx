import { StaticPage } from "@/components/StaticPage";
import { Button } from "@/components/Button";

export default function PricingPage() {
  return (
    <StaticPage title="Pricing" lead="Stay for free. Optional Plus when you want a little more room.">
      <p>Hearth is free for everyday use with the people you already know. No ads in the feed.</p>
      <p>Plus is optional and designed to stay quiet — no paywalled friendships, ever.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card">
          <h2 className="font-display text-2xl text-ink-900">Hearth</h2>
          <p className="mt-2 text-3xl font-semibold text-ink-900">Free</p>
          <p className="mt-3 text-sm text-ink-600">Feed, friends, chat, moments, groups, events, market, and videos for personal circles.</p>
          <Button href="/signup" className="mt-6" variant="primary">Get started</Button>
        </div>
        <div className="rounded-3xl border border-ember-200 bg-ember-50 p-6 shadow-card">
          <h2 className="font-display text-2xl text-ink-900">Hearth Plus</h2>
          <p className="mt-2 text-3xl font-semibold text-ember-700">$6<span className="text-base font-medium text-ink-500">/mo</span></p>
          <p className="mt-3 text-sm text-ink-600">Extra storage for saved posts, custom themes, and early access to listening rooms. Coming soon.</p>
          <Button href="/signup" className="mt-6" variant="ember">Join the waitlist</Button>
        </div>
      </div>
    </StaticPage>
  );
}
