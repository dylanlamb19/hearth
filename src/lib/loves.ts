"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Demo "Love" reacts by you, stored in localStorage on this device as { [itemId]: boolean }.
 * An entry overrides the seed default (seed reactions may already include you).
 */
export const LOVED_KEY = "hearth_loved";
const CHANGE_EVENT = "hearth:loved";

function read(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(LOVED_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Returns [loved, toggle]. `seedLoved` is whether seed data already lists you. */
export function useLoved(itemId: string, seedLoved = false): [boolean, () => boolean] {
  const [loved, setLoved] = useState(seedLoved);

  useEffect(() => {
    const sync = () => {
      const v = read()[itemId];
      setLoved(typeof v === "boolean" ? v : seedLoved);
    };
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [itemId, seedLoved]);

  const toggle = useCallback(() => {
    const all = read();
    const current = typeof all[itemId] === "boolean" ? all[itemId] : seedLoved;
    const next = !current;
    try {
      localStorage.setItem(LOVED_KEY, JSON.stringify({ ...all, [itemId]: next }));
    } catch {
      /* ignore quota / private mode */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return next;
  }, [itemId, seedLoved]);

  return [loved, toggle];
}
