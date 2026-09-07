"use client";

import { useEffect } from "react";
import { Bell } from "lucide-react";

type Props = {
  open: boolean;
  onEnable: () => void;
  onDismiss: () => void;
  busy?: boolean;
};

/** Glow-locked soft cream permission modal — ask once, skippable, no guilt. */
export function NotificationPermissionModal({
  open,
  onEnable,
  onDismiss,
  busy = false,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/30 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-perm-title"
        aria-describedby="notif-perm-body"
        className="w-full max-w-md overflow-hidden rounded-t-3xl border border-ink-100 border-l-4 border-l-ember-300 bg-cream-50 shadow-soft sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cream-100 text-ember-500 ring-1 ring-ink-100/80">
              <Bell className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="notif-perm-title" className="font-display text-xl text-ink-900">
                Stay in the loop?
              </h2>
              <p id="notif-perm-body" className="mt-2 text-sm leading-relaxed text-ink-600">
                Gentle pings when someone reacts, replies, or invites you — nothing noisy.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onDismiss}
              disabled={busy}
              className="order-2 rounded-full px-4 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-cream-100 hover:text-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300 disabled:opacity-50 sm:order-1"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={onEnable}
              disabled={busy}
              className="order-1 inline-flex items-center justify-center rounded-full bg-cream-100 px-5 py-2.5 text-sm font-medium text-ink-800 shadow-soft ring-1 ring-ink-100/80 transition hover:bg-cream-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 disabled:opacity-50 sm:order-2"
            >
              Enable notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
