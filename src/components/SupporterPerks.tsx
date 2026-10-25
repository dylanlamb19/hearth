"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { SUPPORTER_TINTS, type PublicPerks, type SupporterFrame, type SupporterMe } from "@/lib/supporter/perks";

/**
 * Supporter cosmetics. Everything here asks /api/supporter first; that route 404s when
 * SUPPORTER_ENABLED is off, so with the flag off these render nothing and change nothing.
 */
export function usePublicPerks(uid?: string | null): PublicPerks | null {
  const [perks, setPerks] = useState<PublicPerks | null>(null);
  useEffect(() => {
    setPerks(null);
    if (!uid) return;
    let live = true;
    fetch(`/api/supporter?uid=${encodeURIComponent(uid)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && setPerks(j?.perks ?? null))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [uid]);
  return perks;
}

export function useSupporterMe(): { me: SupporterMe | null; enabled: boolean; ready: boolean; reload: () => void } {
  const [state, setState] = useState<{ me: SupporterMe | null; enabled: boolean; ready: boolean }>({ me: null, enabled: false, ready: false });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    fetch("/api/supporter", { cache: "no-store" })
      .then(async (r) => {
        if (!live) return;
        if (r.status === 404) return setState({ me: null, enabled: false, ready: true });
        const j = r.ok ? await r.json() : null;
        setState({ me: j?.me ?? null, enabled: true, ready: true });
      })
      .catch(() => live && setState({ me: null, enabled: false, ready: true }));
    return () => {
      live = false;
    };
  }, [n]);
  return { ...state, reload: () => setN((x) => x + 1) };
}

/** Header tint for your own profile page (10% of the chosen tone); replaces the amber cover stop. */
export function tintColor(perks: PublicPerks | null): string | undefined {
  if (!perks || perks.tint === "amber") return undefined; // amber = the normal cover
  return `${SUPPORTER_TINTS[perks.tint].hex}1A`; // 1A = 10% alpha
}

/** Glow's frames (supporter-assets/, 112 viewBox around a 96px avatar). Ink/ember tones only. */
export function FrameSvg({ frame, className }: { frame: SupporterFrame; className?: string }) {
  const common = { viewBox: "0 0 112 112", className, "aria-hidden": true, fill: "none" } as const;
  switch (frame) {
    case "candle":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="hearth-frame-candle" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#C2553A" />
              <stop offset="1" stopColor="#F2B65A" />
            </linearGradient>
          </defs>
          <circle cx="56" cy="56" r="52" stroke="url(#hearth-frame-candle)" strokeWidth="4" />
        </svg>
      );
    case "hearthstone":
      return (
        <svg {...common}>
          <circle cx="56" cy="56" r="52" stroke="#8A7A6A" strokeWidth="5" strokeDasharray="14 3" strokeLinecap="round" />
        </svg>
      );
    case "sage-leaf":
      return (
        <svg {...common}>
          <circle cx="56" cy="56" r="52" stroke="#7A8B6F" strokeWidth="3" />
          <g fill="#7A8B6F">
            <ellipse cx="22" cy="92" rx="7" ry="3.5" transform="rotate(-45 22 92)" />
            <ellipse cx="32" cy="100" rx="7" ry="3.5" transform="rotate(-20 32 100)" />
            <ellipse cx="14" cy="80" rx="7" ry="3.5" transform="rotate(-70 14 80)" />
          </g>
        </svg>
      );
    case "ember":
      return (
        <svg {...common}>
          <circle cx="56" cy="56" r="52" stroke="#D97706" strokeWidth="4" />
          <circle cx="56" cy="56" r="47" stroke="#FBF6EE" strokeWidth="2" />
        </svg>
      );
  }
}

/** Wraps the 96px profile avatar; the frame sits 8px outside it. No frame = children unchanged. */
export function SupporterFrameWrap({ perks, children }: { perks: PublicPerks | null; children: ReactNode }) {
  if (!perks?.frame) return <>{children}</>;
  return (
    <div className="relative">
      {children}
      <FrameSvg frame={perks.frame} className="pointer-events-none absolute -inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)]" />
    </div>
  );
}

/** 12px ember dot, profile header only, 6px right of the name. Hidden when "Show my Supporter dot" is off. */
export function SupporterDot({ perks }: { perks: PublicPerks | null }) {
  if (!perks?.showDot) return null;
  return (
    <span className="ml-1.5 inline-flex align-middle" title="Keeps the fire going">
      <svg viewBox="0 0 12 12" className="h-3 w-3" role="img" aria-label="Keeps the fire going">
        <circle cx="6" cy="6" r="5" fill="#D97706" />
        <circle cx="6" cy="6" r="5" fill="none" stroke="#FBF6EE" strokeWidth="1.5" />
        <circle cx="5" cy="5" r="1.4" fill="#F2B65A" />
      </svg>
    </span>
  );
}

/** Settings row. Renders nothing unless the flag is on. */
export function SupporterSettingsRow() {
  const { enabled, me } = useSupporterMe();
  if (!enabled) return null;
  const needsLook = me?.status === "past_due" && me.isSupporter;
  return (
    <Link
      href="/settings/supporter"
      className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-cream-50 px-4 py-3 transition hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
    >
      <span className="flex min-w-0 items-center gap-3">
        <SupporterDot perks={{ frame: null, tint: "amber", showDot: true }} />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink-800">Hearth Supporter</span>
          <span className="block text-xs text-ink-600">
            {needsLook ? "Card needs a look" : me?.isSupporter ? "Thank you for keeping the fire going." : "Optional. Hearth stays free for everyone."}
          </span>
        </span>
      </span>
      <ChevronRight strokeWidth={1.75} className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
    </Link>
  );
}
