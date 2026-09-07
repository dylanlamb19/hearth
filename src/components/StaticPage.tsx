import { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

export function StaticPage({
  title,
  lead,
  draft = false,
  lastUpdated,
  children,
}: {
  title: string;
  lead: string;
  /** Soft “Draft” badge for living policy copy. */
  draft?: boolean;
  /** Short date label, e.g. “Sep 6, 2026”. */
  lastUpdated?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream-100">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Hearth</p>
          {draft && (
            <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-[11px] font-medium text-ink-500 ring-1 ring-ink-100">
              Draft
            </span>
          )}
        </div>
        <h1 className="mt-3 font-display text-4xl text-ink-900">{title}</h1>
        <p className="mt-4 text-lg text-ink-600">{lead}</p>
        {lastUpdated && (
          <p className="mt-2 text-xs text-ink-400">Last updated {lastUpdated}</p>
        )}
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-ink-700">{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}
