"use client";

import { useState } from "react";
import { Flag, Ban, MoreHorizontal, X } from "lucide-react";
import { Button } from "./Button";

export function ReportMenu({ subject = "this" }: { subject?: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More actions"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-1.5 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ink-700 hover:bg-cream-100"
            onClick={() => {
              setDone("Thanks. We received your report about " + subject + ".");
              setOpen(false);
            }}
          >
            <Flag className="h-4 w-4" /> Report
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ink-700 hover:bg-cream-100"
            onClick={() => {
              setDone("Blocked. You will not see " + subject + " again.");
              setOpen(false);
            }}
          >
            <Ban className="h-4 w-4" /> Block
          </button>
        </div>
      )}
      {done && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/30 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-display text-xl text-ink-900">Got it</h4>
                <p className="mt-2 text-sm text-ink-600">{done}</p>
                <p className="mt-3 text-xs text-ink-400">
                  Hearth is for people you already know. Reports are reviewed quietly. You control who sees you.
                </p>
              </div>
              <button type="button" onClick={() => setDone(null)} className="text-ink-400 hover:text-ink-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Button className="mt-5 w-full" onClick={() => setDone(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
