"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "hearth_checklist";

const items = [
  { href: "/profile", label: "Finish profile" },
  { href: "/people", label: "Find people" },
  { href: "/home?compose=1", label: "Share a first Moment" },
] as const;

export function OnboardingChecklist() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setVisible(false);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
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
              className="flex items-center justify-between rounded-2xl bg-cream-50 px-3 py-2.5 text-sm text-ink-800 ring-1 ring-ink-100 transition hover:bg-cream-100 hover:ring-ember-200"
            >
              <span>{item.label}</span>
              <span className="text-xs text-ink-400">Open</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
