"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, X } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { buildInviteUrl, getOrCreateInviteCode } from "@/lib/invite";

type InviteSheetProps = {
  open: boolean;
  onClose: () => void;
};

/** Quiet cream invite sheet — copy-link only, no bulk sends, no guilt on dismiss. */
export function InviteSheet({ open, onClose }: InviteSheetProps) {
  const { user } = useAuth();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    if (!open) return "";
    const seed = user?.handle || user?.id || "friend";
    const userId = user?.id || user?.handle || null;
    return getOrCreateInviteCode(seed, userId);
  }, [open, user?.handle, user?.id]);

  const inviteLink = useMemo(() => (code ? buildInviteUrl(code) : ""), [code]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setToast(null);
    }
  }, [open]);

  async function handleCopy() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = inviteLink;
        el.setAttribute("readonly", "");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      } catch {
        /* ignore */
      }
    }
    setCopied(true);
    setToast("Link copied");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/30 p-0 sm:items-center sm:p-4"
        role="presentation"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-sheet-title"
          aria-describedby="invite-sheet-body"
          className="flex w-full flex-col overflow-hidden rounded-t-3xl border border-ink-100 bg-cream-50 shadow-soft sm:max-w-md sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-ink-100/80 px-5 py-4">
            <h2 id="invite-sheet-title" className="font-display text-xl text-ink-900">
              Invite someone in
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-full p-1.5 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <p id="invite-sheet-body" className="text-sm leading-relaxed text-ink-600">
              Share with someone you'd invite into the room — no bulk sends.
            </p>

            <div className="mt-4 rounded-2xl bg-cream-100 px-3.5 py-3 ring-1 ring-ink-100/80">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Your link</p>
              <p className="mt-1 break-all font-mono text-xs leading-relaxed text-ink-800 sm:text-sm">
                {inviteLink || "..."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cream-100 px-5 py-2.5 text-sm font-medium text-ink-800 shadow-soft ring-1 ring-ink-100/80 transition hover:bg-cream-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 active:scale-[0.99]"
            >
              <Link2 className="h-4 w-4 text-ember-500" aria-hidden />
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink-900/90 px-4 py-2 text-sm text-cream-50 shadow-soft"
        >
          {toast}
        </div>
      )}
    </>
  );
}
