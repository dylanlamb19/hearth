import { ReactNode } from "react";
import { Button } from "./Button";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-ink-200 bg-white/50 px-6 py-16 text-center">
      {icon && <div className="mb-4 text-ink-400">{icon}</div>}
      <h3 className="font-display text-2xl text-ink-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-ink-500">{description}</p>
      {actionLabel && actionHref && (
        <Button href={actionHref} className="mt-6" variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
