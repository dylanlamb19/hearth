"use client";

import { useEffect, useState } from "react";

const EVENT = "hearth:blocked";
/** Matches the duration-300 fade on cards and comments. */
const FADE_MS = 300;

/** Tell every mounted feed, pin and comment list that someone was just blocked. */
export function announceBlocked(id: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id } }));
}

/**
 * People blocked during this visit. `fading` lets their Moments and comments fade out,
 * then they move to `gone` and are dropped from the list, without a reload.
 */
export function useJustBlocked(): { fading: Set<string>; gone: Set<string> } {
  const [fading, setFading] = useState<Set<string>>(() => new Set());
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    function onBlocked(e: Event) {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (!id) return;
      setFading((s) => new Set(s).add(id));
      timers.push(
        setTimeout(() => {
          setGone((s) => new Set(s).add(id));
          setFading((s) => {
            const n = new Set(s);
            n.delete(id);
            return n;
          });
        }, FADE_MS),
      );
    }
    window.addEventListener(EVENT, onBlocked);
    return () => {
      window.removeEventListener(EVENT, onBlocked);
      timers.forEach(clearTimeout);
    };
  }, []);
  return { fading, gone };
}
