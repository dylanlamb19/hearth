"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { markFindPeoplePending } from "@/lib/notificationPermission";
import { InviteSheet } from "./InviteSheet";
import { useAuth } from "./AuthProvider";
import type { SessionUser } from "@/lib/auth";

const STORAGE_KEY = "hearth_checklist";

const items = [
  {
    href: "/profile",
    label: "Finish profile",
    done: (u: SessionUser | null) => Boolean(u?.onboardingCompletedAt || u?.photoUrl || u?.bio?.trim()),
  },
  {
    href: "/people",
    label: "Find people",
    notifyPending: true,
    done: (u: SessionUser | null) => (u?.followingIds?.length ?? 0) > 0,
  },
  { href: "/home?compose=1", label: "Share a first Moment", done: () => false },
] as const;

export function OnboardingChecklist() {
  const { user } = useAuth();
  // Read the dismissed state on first render (AppShell only mounts this on the client),
  // so no space is reserved once Settle in has been dismissed. null = storage not available yet.
  const [visible, setVisible] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [inviteOpen, setInviteOpen] = useState(false);

  function dismiss() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (visible === null) {
    return <div className="h-[19rem] rounded-3xl bg-cream-50 sm:h-[20rem]" aria-hidden />;
  }
  if (!visible) return null;

  return (
    <>
      <section className="rounded-3xl border border-ink-100 border-l-4 border-l-ember-300 bg-white p-4 shadow-card sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ink-900">Settle in</h2>
            <p className="mt-1 text-sm text-ink-500">A few gentle next steps whenever you are ready.</p>
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
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => {
                  if ("notifyPending" in item && item.notifyPending) {
                    markFindPeoplePending();
                  }
                }}
                className="flex items-center justify-between rounded-2xl bg-cream-50 px-3 py-2.5 text-sm text-ink-800 ring-1 ring-ink-100 transition hover:bg-cream-100 hover:ring-ember-200"
              >
                <span className={item.done(user) ? "text-ink-500 line-through decoration-ink-300" : ""}>
                  {item.label}
                </span>
                <span className="text-xs text-ink-400">{item.done(user) ? "Done" : "Open"}</span>
              </Link>
            </li>
          ))}
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
