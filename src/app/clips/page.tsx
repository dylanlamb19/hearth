"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { clips, personById } from "@/data/seed";
import { getBlockedIds } from "@/lib/blocked";
import { cn } from "@/lib/utils";

const MUTE_KEY = "hearth-clips-unmuted";
const SWIPE_THRESHOLD = 48;

/** Soft cream pill — readable over dark video without neon glow */
const creamChrome =
  "inline-flex h-11 w-11 items-center justify-center rounded-full bg-cream-100/90 text-ink-800 shadow-[0_2px_10px_rgba(12,10,8,0.42)] ring-1 ring-ink-900/10 backdrop-blur-sm";

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export default function ClipsPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartY = useRef<number | null>(null);
  const wheelLock = useRef(false);

  // Re-read block list each render (client-only localStorage).
  const blockedIds = new Set(getBlockedIds());
  const visibleClips = useMemo(
    () => clips.filter((c) => !blockedIds.has(c.authorId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional re-read via blockedKey
    [[...blockedIds].sort().join(",")],
  );

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(MUTE_KEY);
      if (stored === "1") setMuted(false);
    } catch {
      /* ignore */
    }
  }, []);

  const total = visibleClips.length;
  const clip = visibleClips[index];
  const author = clip ? personById(clip.authorId) : undefined;

  useEffect(() => {
    if (total === 0) {
      setIndex(0);
      return;
    }
    setIndex((i) => Math.min(i, total - 1));
  }, [total]);

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setIndex((i) => Math.min(total - 1, Math.max(0, i + delta)));
      setProgress(0);
      setPlaying(true);
    },
    [total],
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    if (playing) {
      void el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [index, muted, playing, clip]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        go(1);
      } else if (e.key === " " || e.key === "p") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "m") {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      try {
        sessionStorage.setItem(MUTE_KEY, next ? "0" : "1");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current == null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const dy = touchStartY.current - endY;
    touchStartY.current = null;
    if (Math.abs(dy) < SWIPE_THRESHOLD) return;
    if (dy > 0) go(1);
    else go(-1);
  }

  function onWheel(e: React.WheelEvent) {
    if (wheelLock.current) return;
    if (Math.abs(e.deltaY) < 20) return;
    wheelLock.current = true;
    if (e.deltaY > 0) go(1);
    else go(-1);
    window.setTimeout(() => {
      wheelLock.current = false;
    }, 450);
  }

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-cream-200">
        Warming the room…
      </div>
    );
  }

  if (total === 0 || !clip) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center">
        <Link
          href="/home"
          className={cn("absolute left-4 top-4 z-20", creamChrome)}
          aria-label="Back to home"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="font-display text-2xl text-cream-100">No Clips yet</h1>
        <p className="mt-2 max-w-xs text-sm text-cream-300/80">
          Short vertical moments will show up here when friends share them. For now, the hearth stays quiet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-ink-950 touch-none select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* Dark wash + 9:16 stage */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-full w-full max-w-[480px] aspect-[9/16] bg-ink-950">
          <video
            key={clip.id}
            ref={videoRef}
            src={clip.videoUrl}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            loop
            muted={muted}
            poster={clip.thumb}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (!v.duration) return;
              setProgress(v.currentTime / v.duration);
            }}
            onClick={() => setPlaying((p) => !p)}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950/50 via-transparent to-ink-950/70" />

          {/* Progress hairline */}
          <div className="absolute inset-x-0 bottom-0 z-20 h-px bg-cream-100/20">
            <div
              className="h-full bg-cream-100/90 transition-[width] duration-100 ease-linear"
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          </div>
          <p className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 text-[10px] tracking-wide text-cream-200/60">
            {index + 1} / {total}
          </p>
        </div>
      </div>

      {/* Top chrome — cream pills, readable over video */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link
          href="/home"
          className={cn("pointer-events-auto", creamChrome)}
          aria-label="Back to home"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <button
          type="button"
          onClick={toggleMute}
          className={cn("pointer-events-auto", creamChrome)}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {/* Right rail — cream fill + ink icons, soft dark wash (no neon) */}
      <div className="absolute bottom-28 right-3 z-30 flex flex-col items-center gap-5 sm:right-[max(0.75rem,calc(50%-240px+0.75rem))]">
        <RailButton label={formatCount(clip.likes)} ariaLabel="Like">
          <Heart className="h-6 w-6" />
        </RailButton>
        <RailButton label={formatCount(clip.comments)} ariaLabel="Comment">
          <MessageCircle className="h-6 w-6" />
        </RailButton>
        <RailButton label="Share" ariaLabel="Share">
          <Share2 className="h-6 w-6" />
        </RailButton>
      </div>

      {/* Left-bottom creator + caption */}
      <div className="absolute bottom-10 left-4 z-30 max-w-[min(70%,18rem)] sm:left-[max(1rem,calc(50%-240px+1rem))]">
        <Link
          href={author ? `/profile/${author.handle}` : "/profile"}
          className="inline-flex items-center gap-2.5"
        >
          {author && <Avatar name={author.name} size="sm" className="ring-2 ring-cream-100/40" />}
          <span className="text-sm font-medium text-cream-100 drop-shadow">@{author?.handle ?? "friend"}</span>
        </Link>
        <p
          className={cn(
            "mt-2 text-sm leading-snug text-cream-100/90",
            "line-clamp-2 [mask-image:linear-gradient(to_bottom,black_70%,transparent)]",
          )}
        >
          {clip.caption}
        </p>
      </div>
    </div>
  );
}

function RailButton({
  children,
  label,
  ariaLabel,
}: {
  children: React.ReactNode;
  label: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="flex min-h-[44px] min-w-[44px] flex-col items-center gap-1"
    >
      <span className={cn(creamChrome, "transition hover:bg-cream-100")}>
        {children}
      </span>
      <span className="text-[11px] font-medium text-cream-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
        {label}
      </span>
    </button>
  );
}
