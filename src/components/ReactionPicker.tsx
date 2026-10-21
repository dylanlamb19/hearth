"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ReactionIcon } from "./icons/reactions";
import { REACTION_KINDS, REACTION_LABEL, type ReactionKind } from "@/lib/reactionKinds";
import { cn } from "@/lib/utils";

const HOLD_MS = 450;
const HOVER_MS = 350;

/**
 * The Love button plus Glow's reaction picker.
 * - Tap: Love if you haven't reacted, otherwise removes your reaction.
 * - Hold (long-press) or hover: opens a cream pill of all six. Tapping a different one switches
 *   to it, tapping your current one removes it.
 * - Keyboard: ArrowUp/ArrowDown opens the pill, Left/Right moves, Enter/Space picks, Escape closes.
 */
export function ReactionPicker({
  mine,
  count,
  onReact,
}: {
  mine: ReactionKind | null;
  count: number;
  onReact: (kind: ReactionKind | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  function clearTimers() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    holdTimer.current = hoverTimer.current = null;
  }

  function openAndFocus(index = 0) {
    setOpen(true);
    requestAnimationFrame(() => itemRefs.current[index]?.focus());
  }

  function pick(kind: ReactionKind) {
    onReact(mine === kind ? null : kind);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      openAndFocus(Math.max(0, mine ? REACTION_KINDS.indexOf(mine) : 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onItemKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const n = REACTION_KINDS.length;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      itemRefs.current[(index + 1) % n]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      itemRefs.current[(index - 1 + n) % n]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const label = mine ? REACTION_LABEL[mine] : "Love";

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => {
        clearTimers();
        hoverTimer.current = setTimeout(() => setOpen(true), HOVER_MS);
      }}
      onMouseLeave={() => {
        clearTimers();
        setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-pressed={mine !== null}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={mine ? `${label} (tap to remove). Arrow up for more reactions.` : "Love. Arrow up for more reactions."}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          clearTimers();
          holdTimer.current = setTimeout(() => {
            suppressClick.current = true;
            setOpen(true);
          }, HOLD_MS);
        }}
        onPointerUp={() => holdTimer.current && clearTimeout(holdTimer.current)}
        onPointerLeave={() => holdTimer.current && clearTimeout(holdTimer.current)}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          onReact(mine ? null : "love");
          setOpen(false);
        }}
        onKeyDown={onTriggerKey}
        className={cn(
          "inline-flex select-none items-center gap-1.5 rounded-full px-3 py-1.5 transition",
          mine ? "bg-ember-100 text-ember-glow" : "text-ink-500 hover:bg-cream-100",
        )}
      >
        <ReactionIcon kind={mine ?? "love"} className="h-4 w-4" />
        <span>{label}</span>
        {count > 0 && <span aria-hidden>· {count}</span>}
      </button>

      {open && (
        <span
          role="group"
          aria-label="Reactions"
          className="absolute bottom-full left-0 z-30 mb-1 flex items-center gap-1 rounded-full border border-ink-100 bg-cream-50 px-2 py-1.5 shadow-card"
        >
          {REACTION_KINDS.map((kind, i) => (
            <button
              key={kind}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              aria-label={REACTION_LABEL[kind]}
              aria-pressed={mine === kind}
              onClick={() => pick(kind)}
              onKeyDown={(e) => onItemKey(e, i)}
              className={cn(
                "group relative rounded-full p-1 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-300",
                mine === kind ? "text-ember-glow" : "text-ink-500 hover:text-ink-800",
              )}
            >
              <ReactionIcon kind={kind} className="h-7 w-7" />
              <span
                role="tooltip"
                className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-900/90 px-2 py-0.5 text-[11px] text-cream-50 group-hover:block group-focus-visible:block"
              >
                {REACTION_LABEL[kind]}
              </span>
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
