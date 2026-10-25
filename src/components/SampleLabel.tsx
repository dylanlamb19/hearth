import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small warm tag for sample (seed) items that aren't real people's content. */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-ember-200 bg-cream-100 px-2 py-0.5 text-[11px] font-medium text-ember-700",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" strokeWidth={1.75} aria-hidden />
      Sample — coming soon
    </span>
  );
}

/** Page-level note explaining that what's shown is sample content. */
export function SampleNotice({ feature, children }: { feature: string; children?: React.ReactNode }) {
  return (
    <div
      role="note"
      className="mt-4 flex items-start gap-2.5 rounded-2xl border border-ember-200 bg-cream-50 px-4 py-3 text-sm text-ink-700"
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ember-500" strokeWidth={1.75} aria-hidden />
      <p>
        <span className="font-medium text-ink-900">Sample — coming soon.</span> {feature} is still being built, so
        everything here is sample content, not real people. {children}
      </p>
    </div>
  );
}
