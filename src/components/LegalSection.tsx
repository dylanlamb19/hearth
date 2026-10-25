import { ReactNode } from "react";

/** A titled block of plain-language policy copy inside StaticPage. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl text-ink-900">{title}</h2>
      {children}
    </section>
  );
}

export function Todo({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-ember-50 px-1.5 py-0.5 text-xs font-medium text-ember-800 ring-1 ring-ember-200">
      TODO: {children}
    </span>
  );
}
