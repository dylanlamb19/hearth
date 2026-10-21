"use client";

import { useCallback, useEffect, useRef } from "react";
import { markSeen } from "@/lib/moments";

const VISIBLE_MS = 1000;
const FLUSH_MS = 4000;

/**
 * Marks a Moment seen once it's at least 50% visible for 1s. Writes are batched (every few
 * seconds, on hide and on unmount) and each id is sent once per page load.
 */
export function useSeenTracker() {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queued = useRef(new Set<string>());
  const sent = useRef(new Set<string>());
  const observer = useRef<IntersectionObserver | null>(null);
  const nodes = useRef(new Map<Element, string>());

  const flush = useCallback(() => {
    const ids = [...queued.current];
    queued.current.clear();
    if (ids.length) void markSeen(ids);
  }, []);

  const getObserver = useCallback(() => {
    if (observer.current || typeof IntersectionObserver === "undefined") return observer.current;
    const t = timers.current;
    observer.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = nodes.current.get(entry.target);
          if (!id || sent.current.has(id)) continue;
          if (entry.intersectionRatio >= 0.5) {
            if (!t.has(id)) {
              t.set(
                id,
                setTimeout(() => {
                  t.delete(id);
                  sent.current.add(id);
                  queued.current.add(id);
                }, VISIBLE_MS),
              );
            }
          } else {
            const timer = t.get(id);
            if (timer) clearTimeout(timer);
            t.delete(id);
          }
        }
      },
      { threshold: [0, 0.5] },
    );
    // Re-observe anything registered before (e.g. after a remount).
    for (const node of nodes.current.keys()) observer.current.observe(node);
    return observer.current;
  }, []);

  useEffect(() => {
    getObserver();
    const t = timers.current;
    const interval = setInterval(flush, FLUSH_MS);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      observer.current?.disconnect();
      observer.current = null;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      t.forEach(clearTimeout);
      t.clear();
      flush();
    };
  }, [flush, getObserver]);

  /** Ref callback for a Moment's wrapper. */
  return useCallback(
    (id: string) => (el: HTMLElement | null) => {
      const obs = getObserver();
      for (const [node, nid] of nodes.current) {
        if (nid === id && node !== el) {
          obs?.unobserve(node);
          nodes.current.delete(node);
        }
      }
      if (el && !nodes.current.has(el)) {
        nodes.current.set(el, id);
        obs?.observe(el);
      }
    },
    [getObserver],
  );
}
