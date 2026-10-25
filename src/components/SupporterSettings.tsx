"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FrameSvg, SupporterDot, useSupporterMe } from "@/components/SupporterPerks";
import { FRAME_LABELS, PLANS, SUPPORTER_FRAMES, SUPPORTER_TINTS, type SupporterPlan, type SupporterTint } from "@/lib/supporter/perks";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "the end of this period");
const quiet = "text-sm text-ink-600 underline underline-offset-2 transition hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 rounded";

async function post(body: Record<string, unknown>): Promise<{ url?: string; error?: string }> {
  const r = await fetch("/api/supporter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return r.ok ? j : { error: j.error || "Something went wrong. Try again?" };
}

export function SupporterSettings() {
  const { me, ready, reload } = useSupporterMe();
  const [plan, setPlan] = useState<SupporterPlan>("monthly");
  const [consent, setConsent] = useState(false);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function run(body: Record<string, unknown>, after?: () => void) {
    setBusy(true);
    setNote(null);
    const r = await post(body);
    setBusy(false);
    if (r.error) return setNote(r.error);
    if (r.url) {
      window.location.assign(r.url);
      return;
    }
    after?.();
    reload();
  }

  const success = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("thanks") === "1";

  return (
    <AppShell>
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
        <ChevronLeft strokeWidth={1.75} className="h-4 w-4" aria-hidden /> Settings
      </Link>
      <section className="mt-3 rounded-3xl border border-ink-100 bg-cream-cover p-6 shadow-card">
        <h1 className="font-display text-2xl text-ink-900">Help keep the fire going.</h1>
        <p className="mt-1 text-sm text-ink-600">Hearth stays free for everyone. Supporters cover the firewood.</p>

        <ul className="mt-5 space-y-2 text-sm text-ink-800">
          {["4 hand-drawn profile frames", "A warm tone behind your own profile header", "A small Supporter dot by your name on your profile (you can hide it)"].map((p) => (
            <li key={p} className="flex items-start gap-2">
              <Check strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0 text-ember-glow" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-500">Everything else on Hearth, including safety and privacy tools, stays free.</p>

        {!ready ? (
          <Loader2 strokeWidth={1.75} className="mt-6 h-5 w-5 animate-spin text-ink-400" aria-label="Loading" />
        ) : !me ? (
          <p className="mt-6 text-sm text-ink-600">Sign in to see Supporter options.</p>
        ) : me.isSupporter ? (
          <div className="mt-6 space-y-5">
            {success && <p className="text-sm text-ink-800">Thank you. The fire’s a little warmer.</p>}
            <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-100">
              <p className="text-sm text-ink-800">
                {me.plan ? `${PLANS[me.plan].label}, ${PLANS[me.plan].price}/${PLANS[me.plan].per}` : "Supporter"}
                <SupporterDot perks={{ frame: null, tint: "amber", showDot: true }} />
              </p>
              <p className="mt-1 text-xs text-ink-600">
                {me.cancelAtPeriodEnd ? `Ends ${fmt(me.currentPeriodEnd)}. You keep your perks until then.` : `Renews ${fmt(me.currentPeriodEnd)}.`}
              </p>
              {me.status === "past_due" && (
                <p className="mt-2 text-xs text-ink-600">
                  Card needs a look.{" "}
                  <button type="button" className={quiet} disabled={busy} onClick={() => run({ action: "portal" })}>
                    Update card
                  </button>
                </p>
              )}
              <div className="mt-3">
                {me.cancelAtPeriodEnd ? (
                  <button type="button" className={quiet} disabled={busy} onClick={() => run({ action: "resume" })}>
                    Keep supporting
                  </button>
                ) : confirmCancel ? (
                  <div role="dialog" aria-label="Cancel Supporter?" className="rounded-xl bg-cream-50 p-3 ring-1 ring-ink-100">
                    <p className="text-sm text-ink-800">Cancel Supporter? You’ll keep your perks until {fmt(me.currentPeriodEnd)}.</p>
                    <div className="mt-3 flex items-center gap-4">
                      <button type="button" className="rounded-full bg-cream-100 px-4 py-2 text-sm font-medium text-ink-800 ring-1 ring-ink-100" onClick={() => setConfirmCancel(false)}>
                        Keep
                      </button>
                      <button type="button" className={quiet} disabled={busy} onClick={() => run({ action: "cancel" }, () => setConfirmCancel(false))}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className={quiet} onClick={() => setConfirmCancel(true)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-ink-900">Pick your frame</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {[null, ...SUPPORTER_FRAMES].map((f) => (
                  <button
                    key={f ?? "none"}
                    type="button"
                    aria-pressed={me.perks.frame === f}
                    disabled={busy}
                    onClick={() => run({ action: "prefs", frame: f })}
                    className={`flex w-20 flex-col items-center gap-1 rounded-2xl p-2 text-xs text-ink-700 ring-1 transition ${me.perks.frame === f ? "bg-white ring-ember-glow" : "ring-ink-100 hover:bg-white"}`}
                  >
                    {f ? <FrameSvg frame={f} className="h-12 w-12" /> : <span className="h-12 w-12 rounded-full ring-1 ring-ink-200" />}
                    {f ? FRAME_LABELS[f] : "None"}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium text-ink-900">Profile color</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(SUPPORTER_TINTS) as SupporterTint[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={me.perks.tint === t}
                    disabled={busy}
                    onClick={() => run({ action: "prefs", tint: t })}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-ink-800 ring-1 ${me.perks.tint === t ? "bg-white ring-ember-glow" : "ring-ink-100 hover:bg-white"}`}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: SUPPORTER_TINTS[t].hex }} aria-hidden />
                    {SUPPORTER_TINTS[t].label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="flex items-center gap-2 text-sm text-ink-800">
              <input type="checkbox" className="h-4 w-4 accent-ember-glow" checked={me.perks.showDot} disabled={busy} onChange={(e) => run({ action: "prefs", showDot: e.target.checked })} />
              Show my Supporter dot
            </label>
          </div>
        ) : !me.isAdult ? (
          <p className="mt-6 text-sm text-ink-600">Supporter is for adults 18+.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {me.status === "past_due" ? (
              <p className="text-sm text-ink-600">Your Supporter perks are paused. Thanks for the time you gave.</p>
            ) : null}
            <div role="radiogroup" aria-label="Plan" className="inline-flex rounded-full bg-white p-1 ring-1 ring-ink-100">
              {(Object.keys(PLANS) as SupporterPlan[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={plan === p}
                  onClick={() => setPlan(p)}
                  className={`rounded-full px-4 py-1.5 text-sm ${plan === p ? "bg-cream-100 font-medium text-ink-900" : "text-ink-600"}`}
                >
                  {PLANS[p].label} {PLANS[p].price}
                  {p === "yearly" && <span className="ml-1 text-xs text-ink-500">save 25%</span>}
                </button>
              ))}
            </div>
            <p className="text-sm text-ink-600">
              $4/month (or $36/year), renews automatically until you cancel. Cancel anytime in Settings &gt; Hearth Supporter.
            </p>
            <label className="flex items-start gap-2 text-sm text-ink-800">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ember-glow" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              I understand it renews automatically.
            </label>
            <label className="flex items-start gap-2 text-sm text-ink-800">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ember-glow" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
              I’m 18 or older.
            </label>
            <button
              type="button"
              disabled={!consent || !adult || busy}
              onClick={() => run({ action: "checkout", plan, consentAutoRenew: consent, confirmAdult: adult })}
              className="inline-flex items-center gap-2 rounded-full bg-ember-glow px-5 py-2.5 text-sm font-medium text-cream-50 shadow-soft transition hover:bg-ember-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 disabled:opacity-50"
            >
              {busy && <Loader2 strokeWidth={1.75} className="h-4 w-4 animate-spin" aria-hidden />}
              Become a Supporter
            </button>
            <p className="text-xs text-ink-500">Cancel anytime from Settings.</p>
            {!me.paymentsReady && <p className="text-xs text-ink-500">Payments aren’t switched on yet, so nothing can be charged.</p>}
          </div>
        )}
        {note && (
          <p role="status" className="mt-4 text-sm text-ink-700">
            {note}
          </p>
        )}
      </section>
    </AppShell>
  );
}
