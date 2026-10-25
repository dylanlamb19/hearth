import { StaticPage } from "@/components/StaticPage";
import { Button } from "@/components/Button";
import { supporterEnabled } from "@/lib/supporter/server";

// Read SUPPORTER_ENABLED per request so flipping the flag needs no rebuild.
export const dynamic = "force-dynamic";

export default function PricingPage() {
  const supporter = supporterEnabled();
  return (
    <StaticPage title="Pricing" lead="Hearth is free, for everyone, for good.">
      <p>Everything Hearth does is free: your feed, friends, chat, Moments, groups, events and photos. No ads in the feed.</p>
      <p>Safety, privacy and the people you know are never behind a price.</p>
      <div className={`mt-8 grid gap-4 ${supporter ? "sm:grid-cols-2" : ""}`}>
        <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card">
          <h2 className="font-display text-2xl text-ink-900">Hearth</h2>
          <p className="mt-2 text-3xl font-semibold text-ink-900">Free</p>
          <p className="mt-3 text-sm text-ink-600">Everything, for you and the people you already know.</p>
          <Button href="/signup" className="mt-6" variant="primary">Get started</Button>
        </div>
        {supporter && (
          <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card">
            <h2 className="font-display text-2xl text-ink-900">Hearth Supporter</h2>
            <p className="mt-2 text-3xl font-semibold text-ink-900">
              $4<span className="text-base font-medium text-ink-500">/month</span>
            </p>
            <p className="text-sm text-ink-500">or $36/year</p>
            <p className="mt-3 text-sm text-ink-600">
              Optional. Hearth stays free for everyone; Supporters cover the firewood. A small thank-you, all cosmetic:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-600">
              <li>Hand-drawn avatar frames</li>
              <li>A warm tint for your profile header</li>
              <li>A small Supporter dot, which you can hide</li>
            </ul>
            <p className="mt-3 text-sm text-ink-500">Nothing in Hearth is locked without it. For adults 18+. Cancel anytime from Settings.</p>
            <Button href="/settings/supporter" className="mt-6" variant="secondary">Learn about Supporter</Button>
          </div>
        )}
      </div>
    </StaticPage>
  );
}
