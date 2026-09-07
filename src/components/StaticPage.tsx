import { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

export function StaticPage({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream-100">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Hearth</p>
        <h1 className="mt-3 font-display text-4xl text-ink-900">{title}</h1>
        <p className="mt-4 text-lg text-ink-600">{lead}</p>
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-ink-700">{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}
