"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { isAgeBlocked } from "@/lib/age";

/** True once mounted on a device flagged by the age gate (read after mount to match the prerender). */
export function useAgeBlocked(): [boolean, (v: boolean) => void] {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    if (isAgeBlocked()) setBlocked(true);
  }, []);
  return [blocked, setBlocked];
}

/** Calm, final screen for the age gate. No retry hint on purpose. */
export function AgeBlockedScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-100 px-6 py-12 text-center">
      <Logo />
      <h1 className="mt-10 font-display text-3xl text-ink-900 text-balance">Hearth is for people 13 and older.</h1>
      <p className="mt-4 max-w-sm text-ink-600">Thanks for stopping by.</p>
    </div>
  );
}
