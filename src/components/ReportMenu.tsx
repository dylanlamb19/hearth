"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Flag, Ban, MoreHorizontal, X } from "lucide-react";
import { Button } from "./Button";
import { addBlockedId } from "@/lib/blocked";

const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Hate",
  "Scam / unsafe listing",
  "Other",
] as const;
type ReportReason = (typeof REPORT_REASONS)[number];

type Sheet =
  | { kind: "report"; reason: ReportReason | null; note: string }
  | { kind: "report-thanks" }
  | { kind: "block-confirm" }
  | { kind: "block-done" };

export function ReportMenu({
  subject = "this",
  subjectId,
}: {
  subject?: string;
  /** Stable id persisted to localStorage `hearth_blocked` on block. */
  subjectId?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  function openReport() {
    setMenuOpen(false);
    setSheet({ kind: "report", reason: null, note: "" });
  }

  function openBlock() {
    setMenuOpen(false);
    setSheet({ kind: "block-confirm" });
  }

  function confirmReport() {
    if (sheet?.kind !== "report" || !sheet.reason) return;
    try {
      console.info("[hearth report]", {
        subject,
        subjectId,
        reason: sheet.reason,
        note: sheet.note.trim() || undefined,
      });
    } catch {
      /* ignore */
    }
    setSheet({ kind: "report-thanks" });
  }

  function confirmBlock() {
    const id = (subjectId ?? subject).trim();
    if (id) addBlockedId(id);
    setSheet({ kind: "block-done" });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className="rounded-full p-1.5 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-2xl border border-ink-100 bg-cream-50 shadow-card">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ink-700 hover:bg-cream-100"
            onClick={openReport}
          >
            <Flag className="h-4 w-4 text-ink-500" /> Report
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ink-700 hover:bg-cream-100"
            onClick={openBlock}
          >
            <Ban className="h-4 w-4 text-ink-500" /> Block
          </button>
        </div>
      )}

      {sheet?.kind === "report" && (
        <CreamSheet
          title="Report"
          description={`Tell us what feels off about ${subject}. We review quietly — no drama.`}
          onClose={() => setSheet(null)}
        >
          <div className="mt-4 flex flex-wrap gap-2">
            {REPORT_REASONS.map((reason) => {
              const selected = sheet.reason === reason;
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSheet({ ...sheet, reason })}
                  className={
                    selected
                      ? "rounded-full bg-cream-100 px-3.5 py-2 text-sm font-medium text-ink-800 shadow-soft ring-1 ring-ember-300"
                      : "rounded-full bg-white px-3.5 py-2 text-sm text-ink-600 ring-1 ring-ink-100 hover:bg-cream-100"
                  }
                >
                  {reason}
                </button>
              );
            })}
          </div>
          <label className="mt-4 block text-left text-sm">
            <span className="mb-1.5 block text-ink-500">Optional note</span>
            <textarea
              value={sheet.note}
              onChange={(e) => setSheet({ ...sheet, note: e.target.value })}
              rows={2}
              maxLength={280}
              placeholder="Anything else we should know?"
              className="w-full rounded-2xl border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 focus:border-ember-400 focus:ring-ember-300"
            />
          </label>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="order-2 rounded-full px-4 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-cream-100 hover:text-ink-800 sm:order-1"
            >
              Cancel
            </button>
            <Button
              className="order-1 w-full sm:order-2 sm:w-auto"
              disabled={!sheet.reason}
              onClick={confirmReport}
            >
              Submit report
            </Button>
          </div>
        </CreamSheet>
      )}

      {sheet?.kind === "report-thanks" && (
        <CreamSheet
          title="Thanks"
          description="Thanks — we’ll review quietly."
          onClose={() => setSheet(null)}
        >
          <Button className="mt-5 w-full" onClick={() => setSheet(null)}>
            Close
          </Button>
        </CreamSheet>
      )}

      {sheet?.kind === "block-confirm" && (
        <CreamSheet
          title={`Block ${subject}?`}
          description={`Block ${subject}? They won’t show up in your feed or search.`}
          onClose={() => setSheet(null)}
        >
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="order-2 rounded-full px-4 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-cream-100 hover:text-ink-800 sm:order-1"
            >
              Cancel
            </button>
            <Button className="order-1 w-full sm:order-2 sm:w-auto" onClick={confirmBlock}>
              Block
            </Button>
          </div>
        </CreamSheet>
      )}

      {sheet?.kind === "block-done" && (
        <CreamSheet title="Blocked" description="Blocked." onClose={() => setSheet(null)}>
          <p className="mt-3 text-xs text-ink-400">They won’t show up in your feed or search on this device.</p>
          <Button className="mt-5 w-full" onClick={() => setSheet(null)}>
            Done
          </Button>
        </CreamSheet>
      )}
    </div>
  );
}

function CreamSheet({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/30 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-sheet-title"
        className="w-full max-w-sm overflow-hidden rounded-t-3xl border border-ink-100 border-l-4 border-l-ember-300 bg-cream-50 shadow-soft sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="report-sheet-title" className="font-display text-xl text-ink-900">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{description}</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
