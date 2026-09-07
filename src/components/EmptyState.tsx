import { ReactNode } from "react";
import { Button } from "./Button";

export function EmptyState({
  title,
  description,
  tip,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
  secondaryDisabled,
  icon,
}: {
  title: string;
  description?: string;
  tip?: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  secondaryDisabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[360px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-ink-200 bg-white/50 px-6 py-16 text-center">
      {icon && <div className="mb-4 text-ink-400">{icon}</div>}
      <h3 className="font-display text-2xl text-ink-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>
      )}
      {tip && <p className="mt-2 text-sm leading-relaxed text-ink-400">{tip}</p>}
      {(actionLabel && actionHref) || secondaryLabel ? (
        <div className="mt-6 flex w-full flex-col gap-2">
          {actionLabel && actionHref && (
            <Button href={actionHref} className="w-full" variant="primary">
              {actionLabel}
            </Button>
          )}
          {secondaryLabel &&
            (secondaryDisabled || !secondaryHref ? (
              <Button type="button" variant="secondary" className="w-full" disabled>
                {secondaryLabel}
              </Button>
            ) : (
              <Button href={secondaryHref} className="w-full" variant="secondary">
                {secondaryLabel}
              </Button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
