"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { markFindPeoplePending } from "@/lib/notificationPermission";
import { useAuth } from "./AuthProvider";
import { InviteSheet } from "./InviteSheet";
import { PEOPLE_GOAL, getProgress, stepDone, type SettleProgress, type SettleStep } from "@/lib/settleIn";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hearth_checklist";

/** Mirrors the 3 Settle-in steps from /welcome until all are done, then goes away for good. */
const items: { step: SettleStep; href: string; label: string; notifyPending?: boolean }[] = [
  { step: "photo", href: "/welcome", label: "Add a photo" },
  { step: "people", href: "/people", label: `Knock on ${PEOPLE_GOAL} doors`, notifyPending: true },
  { step: "moment", href: "/home?compose=1", label: "Share a first Moment" },
];

export function OnboardingChecklist() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState<SettleProgress | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const read = () => {
      const p = getProgress(user.id);
      setProgress(p);
      let flagged = false;
      try {
        flagged = localStorage.getItem(STORAGE_KEY) === "1";
        if (p.done) localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setVisible(flagged && !p.done);
    };
    read();
    window.addEventListener("hearth:settle-in", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("hearth:settle-in", read);
      window.removeEventListener("storage", read);
    };
  }, [user]);

  function dismiss() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible || !progress) return null;
  const doneCount = items.filter((i) => stepDone(progress, i.step)).length;

  return (
    <>
      <section className="rounded-3xl border border-ink-100 border-l-4 border-l-ember-300 bg-white p-4 shadow-card sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ink-900">Settle in</h2>
            <p className="mt-1 text-sm text-ink-500">{doneCount} of 3 · whenever you’re ready.</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full p-1.5 text-ink-400 transition hover:bg-cream-100 hover:text-ink-700"
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {items.map((item) => {
            const done = stepDone(progress, item.step);
            const label =
              item.step === "people" && !done
                ? `${item.label} (${progress.knocked.length}/${PEOPLE_GOAL})`
                : item.label;
            return (
              <li key={item.step}>
                {done ? (
                  <div className="flex items-center justify-between rounded-2xl bg-cream-50 px-3 py-2.5 text-sm text-ink-400 ring-1 ring-ink-100">
                    <span className="line-through decoration-ink-300">{item.label}</span>
                    <Check className="h-4 w-4 text-ember-glow" aria-label="Done" />
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (item.notifyPending) markFindPeoplePending();
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-2xl bg-cream-50 px-3 py-2.5 text-sm text-ink-800 ring-1 ring-ink-100 transition hover:bg-cream-100 hover:ring-ember-200",
                    )}
                  >
                    <span>{label}</span>
                    <span className="text-xs text-ink-400">Open</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="mt-3 w-full rounded-2xl border border-ink-200 bg-white px-3 py-2.5 text-sm font-medium text-ink-800 transition hover:bg-cream-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300"
        >
          Invite a friend
        </button>
      </section>

      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
