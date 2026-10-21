"use client";

import { useEffect, useRef, useState } from "react";
import { Check, DoorOpen, Users } from "lucide-react";

export type Audience = "friends" | "everyone";

const OPTIONS: { value: Audience; label: string; sub: string; Icon: typeof Users }[] = [
  { value: "friends", label: "Friends", sub: "People you’ve let in", Icon: Users },
  { value: "everyone", label: "Everyone", sub: "Anyone who follows you", Icon: DoorOpen },
];

/** Composer "Who can see this?" chip (Glow's feed mock). Friends by default. */
export function AudienceChip({ value, onChange }: { value: Audience; onChange: (v: Audience) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Who can see this? ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1 text-xs text-ink-600 ring-1 ring-cream-200 hover:bg-cream-50"
      >
        <current.Icon className="h-3.5 w-3.5" aria-hidden />
        {current.label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Who can see this?"
          className="absolute bottom-full left-0 z-30 mb-2 w-60 rounded-2xl bg-cream-50 p-2 shadow-card ring-1 ring-cream-200"
        >
          <p className="px-2 pb-1 pt-1 text-xs font-medium text-ink-700">Who can see this?</p>
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
                trigger.current?.focus();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-cream-100"
            >
              <o.Icon className="h-3.5 w-3.5 text-ink-500" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink-800">{o.label}</span>
                <span className="block text-xs text-ink-500">{o.sub}</span>
              </span>
              {o.value === value && <Check className="h-4 w-4 text-ember-glow" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
