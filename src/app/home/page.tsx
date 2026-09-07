"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Image as ImageIcon, Video, Smile, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/Button";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useAuth } from "@/components/AuthProvider";
import { posts as seedPosts, people, Post } from "@/data/seed";
import { getBlockedIds } from "@/lib/blocked";
import { cn } from "@/lib/utils";

const tabs = ["For you", "Following", "Friends", "Nearby"];
const FIRST_MOMENT_PLACEHOLDER = "What's happening by the hearth?";

function HearthMark({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <path
        d="M6 22V14c0-5.5 4.5-10 10-10s10 4.5 10 10v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M4 22h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 22c0-3 1.8-5 4-5s4 2 4 5" stroke="#e8731a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const composerRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [compose, setCompose] = useState(false);
  const [tab, setTab] = useState("For you");
  const [audience, setAudience] = useState<"friends" | "public">("friends");
  const [draft, setDraft] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [videoStub, setVideoStub] = useState(false);
  const [feed, setFeed] = useState<Post[]>(seedPosts);
  const [toast, setToast] = useState<string | null>(null);

  // Re-read localStorage block list each render (free-tier, this device).
  const blockedIds = new Set(getBlockedIds());
  const visibleFeed = feed.filter((post) => !blockedIds.has(post.authorId));
  const birthdays = people.filter((p) => p.birthday && !blockedIds.has(p.id));
  const suggestions = people
    .filter((p) => p.id !== "u-ember" && p.id !== user?.id && !blockedIds.has(p.id))
    .slice(0, 3);
  const contacts = people.filter(
    (p) => p.id !== "u-ember" && p.id !== user?.id && !blockedIds.has(p.id),
  );

  const canShare = draft.trim().length > 0 || attachedImage !== null || videoStub;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("compose") !== "1") return;
    setCompose(true);
    requestAnimationFrame(() => composerRef.current?.focus());
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function revokeIfObjectUrl(url: string | null) {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  }

  function clearAttachedImage() {
    setAttachedImage((prev) => {
      revokeIfObjectUrl(prev);
      return null;
    });
  }

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  function handlePhotoPick(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setAttachedImage((prev) => {
      revokeIfObjectUrl(prev);
      return url;
    });
    setVideoStub(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handleShare() {
    if (!canShare || !user) return;
    const body =
      draft.trim() ||
      (attachedImage
        ? "Shared a photo by the hearth."
        : videoStub
          ? "Shared a video by the hearth."
          : "");
    if (!body) return;

    const next: Post = {
      id: `local-${Date.now()}`,
      authorId: user.id,
      body,
      createdAt: "Just now",
      loves: 0,
      comments: 0,
      privacy: audience,
      ...(attachedImage ? { image: attachedImage } : {}),
    };

    setFeed((prev) => [next, ...prev]);
    setDraft("");
    // Keep object URL alive for the feed card; only clear composer state.
    setAttachedImage(null);
    setVideoStub(false);
    showToast("Shared to the hearth.");
  }

  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <OnboardingChecklist />

          <section className="rounded-3xl border border-ink-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name || "You"} />
              <input
                ref={composerRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canShare) {
                    e.preventDefault();
                    handleShare();
                  }
                }}
                placeholder={compose ? FIRST_MOMENT_PLACEHOLDER : "What is on your mind?"}
                className="w-full rounded-full border-0 bg-cream-100 px-4 py-3 text-sm placeholder:text-ink-400 focus:ring-2 focus:ring-ember-300"
                aria-label="Compose a post"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                aria-pressed={attachedImage !== null}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm hover:bg-cream-100",
                  attachedImage
                    ? "bg-cream-100 font-medium text-ink-800 ring-1 ring-ember-300"
                    : "text-ink-600",
                )}
              >
                <ImageIcon className="h-4 w-4 text-ember-500" /> Photo
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => handlePhotoPick(e.target.files)}
              />
              <button
                type="button"
                onClick={() => {
                  setVideoStub((v) => !v);
                  if (!videoStub) clearAttachedImage();
                }}
                aria-pressed={videoStub}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm hover:bg-cream-100",
                  videoStub ? "bg-cream-100 font-medium text-ink-800 ring-1 ring-ember-300" : "text-ink-600",
                )}
              >
                <Video className="h-4 w-4 text-ember-500" /> Video
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-ink-600 hover:bg-cream-100">
                <Smile className="h-4 w-4 text-ember-500" /> Feeling
              </button>
            </div>
            {attachedImage && (
              <div className="mt-3">
                <div className="relative inline-block rounded-2xl bg-cream-100 p-1 ring-1 ring-ink-100/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachedImage}
                    alt="Selected photo preview"
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearAttachedImage}
                    aria-label="Remove photo"
                    className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cream-50 text-ink-600 shadow-soft ring-1 ring-ink-100 transition hover:bg-cream-100 hover:text-ink-900"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              </div>
            )}
            {videoStub && !attachedImage && (
              <p className="mt-2 text-xs text-ink-400">Video attached (stub). Upload comes later.</p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5" role="group" aria-label="Who can see this">
                <button
                  type="button"
                  onClick={() => setAudience("friends")}
                  aria-pressed={audience === "friends"}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs transition",
                    audience === "friends"
                      ? "bg-cream-100 font-medium text-ink-800 ring-1 ring-ember-300"
                      : "text-ink-500 hover:bg-cream-100 hover:text-ink-700",
                  )}
                >
                  Friends
                </button>
                <button
                  type="button"
                  onClick={() => setAudience("public")}
                  aria-pressed={audience === "public"}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs transition",
                    audience === "public"
                      ? "bg-cream-100 font-medium text-ink-800 ring-1 ring-ember-300"
                      : "text-ink-500 hover:bg-cream-100 hover:text-ink-700",
                  )}
                >
                  Public
                </button>
              </div>
              <button
                type="button"
                onClick={handleShare}
                disabled={!canShare}
                className={cn(
                  "inline-flex items-center justify-center rounded-full bg-cream-100 px-5 py-2 text-sm font-medium text-ink-800 shadow-soft ring-1 ring-ink-100/80 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400",
                  canShare
                    ? "hover:bg-cream-50 hover:text-ink-900 active:scale-[0.99]"
                    : "cursor-not-allowed opacity-45",
                )}
              >
                Share
              </button>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
              Friends = people you've connected with. Public = anyone on Hearth.
            </p>
          </section>

          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm",
                  tab === t ? "bg-hearth text-white" : "bg-white text-ink-600 ring-1 ring-ink-100 hover:bg-cream-50",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {visibleFeed.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          <div className="h-16" aria-hidden />

          <div className="sticky bottom-4 z-20 pt-2">
            <Link
              href="/clips"
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-cream-100 text-ink-800 shadow-[0_4px_24px_rgba(26,26,24,0.12)] ring-1 ring-ink-100/80 transition hover:bg-cream-50 hover:shadow-[0_6px_28px_rgba(26,26,24,0.14)] active:scale-[0.99]"
            >
              <HearthMark className="text-ink-900" />
              <span className="text-[15px] font-medium tracking-tight">Watch Clips</span>
            </Link>
          </div>
        </div>

        <aside className="hidden space-y-4 xl:block">
          <section className="rounded-3xl border border-ink-100 bg-white p-4 shadow-card">
            <h2 className="font-medium text-ink-900">Birthdays</h2>
            {birthdays.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">No birthdays today.</p>
            ) : (
              birthdays.map((p) => (
                <div key={p.id} className="mt-3 flex items-center gap-3">
                  <Avatar name={p.name} size="sm" />
                  <p className="text-sm text-ink-700"><span className="font-medium">{p.name}</span> · {p.birthday}</p>
                </div>
              ))
            )}
          </section>

          <section className="rounded-3xl border border-ink-100 bg-white p-4 shadow-card">
            <h2 className="font-medium text-ink-900">Suggested for you</h2>
            <div className="mt-3 space-y-3">
              {suggestions.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Avatar name={p.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{p.name}</p>
                    <p className="text-xs text-ink-400">{p.mutuals} mutuals</p>
                  </div>
                  <Button variant="secondary" className="!px-3 !py-1.5 text-xs">Follow</Button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-ink-100 bg-white p-4 shadow-card">
            <h2 className="font-medium text-ink-900">Contacts</h2>
            <div className="mt-3 space-y-3">
              {contacts.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Avatar name={p.name} size="sm" online={p.online} />
                  <p className="text-sm text-ink-700">{p.name}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900/90 px-4 py-2 text-sm text-cream-50 shadow-soft"
        >
          {toast}
        </div>
      )}
    </AppShell>
  );
}
