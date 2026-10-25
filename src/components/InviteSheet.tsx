"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, Share, X } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { buildInviteUrl, fetchMyInvite, getOrCreateInviteCode, resetMyInvite } from "@/lib/invite";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type InviteSheetProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Glow invite-share-card v2: copy link, native share, quiet "Reset link". Real accounts get a
 * server code (0014) that lasts 14 days; demo mode keeps the device-local code.
 */
export function InviteSheet({ open, onClose }: InviteSheetProps) {
  const { user } = useAuth();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [serverCode, setServerCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const sb = useMemo(() => getSupabaseBrowserClient(), []);

  const localCode = useMemo(() => {
    if (!open || sb) return "";
    const seed = user?.handle || user?.id || "friend";
    const userId = user?.id || user?.handle || null;
    return getOrCreateInviteCode(seed, userId);
  }, [open, sb, user?.handle, user?.id]);

  useEffect(() => {
    if (!open || !sb || !user) return;
    let live = true;
    fetchMyInvite(sb)
      .then((inv) => live && setServerCode(inv.code))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [open, sb, user]);

  const code = sb ? serverCode || "" : localCode;

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
      setConfirmReset(false);
      setError("");
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
    flash("Link copied");
  }

  function flash(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  async function handleShare() {
    if (!inviteLink) return;
    try {
      await navigator.share({ title: "Come sit with me on Hearth", url: inviteLink });
    } catch {
      /* dismissed */
    }
  }

  async function handleReset() {
    if (!sb) return;
    setBusy(true);
    setError("");
    try {
      const inv = await resetMyInvite(sb);
      setServerCode(inv.code);
      setCopied(false);
      flash("New link ready");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setConfirmReset(false);
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

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
              Your invite link
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
              Anyone with this link can join Hearth. Links last 14 days.
            </p>

            <div className="mt-4 rounded-2xl bg-cream-100 px-3.5 py-3 ring-1 ring-ink-100/80">
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

            {canShare && (
              <button
                type="button"
                onClick={() => void handleShare()}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-ink-700 ring-1 ring-ink-100 transition hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
              >
                <Share className="h-4 w-4 text-ember-500" aria-hidden />
                Share…
              </button>
            )}

            {error && <p className="mt-3 text-center text-xs text-ink-600">{error}</p>}

            {sb && serverCode && (
              <div className="mt-4 text-center">
                {confirmReset ? (
                  <div className="rounded-2xl bg-cream-100 px-3 py-3 text-sm text-ink-700">
                    <p>Reset your link? The old one stops working.</p>
                    <div className="mt-2 flex justify-center gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleReset()}
                        className="rounded-full px-3 py-1 text-xs font-medium text-ember-700 ring-1 ring-ember-200 hover:bg-ember-50 disabled:opacity-60"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="rounded-full px-3 py-1 text-xs text-ink-500 hover:text-ink-700"
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="text-xs text-ink-400 underline-offset-2 hover:text-ink-600 hover:underline"
                  >
                    Reset link
                  </button>
                )}
              </div>
            )}
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
