"use client";

import { useEffect, useRef, useState } from "react";
import { follow, listFollowingIds, unfollow } from "@/lib/follows";
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
import { useJustBlocked } from "@/lib/blockedNow";
import {
  createMoment,
  deleteMoment,
  demoSeenIds,
  getFeed,
  updateMoment,
  type FeedCursor,
  type FeedTab,
} from "@/lib/moments";
import { AudienceChip, type Audience } from "@/components/feed/AudienceChip";
import { HearthDrawing } from "@/components/feed/HearthDrawing";
import { useSeenTracker } from "@/components/feed/useSeenTracker";
import { InviteSheet } from "@/components/InviteSheet";
import {
  checkMedia,
  mediaKindOf,
  uploadMedia,
  type MediaKind,
} from "@/lib/media";
import { getReportedIds } from "@/lib/reported";
import { cn } from "@/lib/utils";
import {
  dismissNudge,
  getLocalAvatar,
  pickPrompt,
  shouldNudge,
  takeFirstMoment,
  dismissPhotoCard,
  getProgress,
  photoCardDismissed,
  updateProgress,
} from "@/lib/settleIn";

const tabs: { value: FeedTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "friends", label: "Friends" },
  { value: "following", label: "Following" },
];
const TAB_KEY = "hearth_feed_tab";

function readTab(): FeedTab {
  if (typeof window === "undefined") return "all";
  const v = localStorage.getItem(TAB_KEY);
  return v === "friends" || v === "following" ? v : "all";
}

/** Demo feed: the sample posts, filtered by tab, with up to 5 unseen ones on top. */
function demoFeed(
  all: Post[],
  tab: FeedTab,
  selfId: string | undefined,
  following: string[],
): Post[] {
  const list = all.filter((p) => {
    if (tab === "following") return following.includes(p.authorId);
    if (tab === "friends")
      return (
        p.authorId === selfId ||
        !following.includes(p.authorId) ||
        p.privacy === "friends"
      );
    return true;
  });
  const seen = new Set(demoSeenIds());
  let pinned = 0;
  const top: Post[] = [];
  for (const p of list) {
    if (
      pinned < 5 &&
      p.authorId !== selfId &&
      !seen.has(p.id) &&
      !p.id.startsWith("local-")
    ) {
      top.push({ ...p, fromYourPeople: true });
      pinned += 1;
    }
  }
  return [...top, ...list.map((p) => ({ ...p, fromYourPeople: false }))];
}

function HearthMark({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M6 22V14c0-5.5 4.5-10 10-10s10 4.5 10 10v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 22h24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 22c0-3 1.8-5 4-5s4 2 4 5"
        stroke="#e8731a"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function HomePage() {
  const { user, mode } = useAuth();
  const composerRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [compose, setCompose] = useState(false);
  const [tab, setTabState] = useState<FeedTab>("all");
  const [audience, setAudience] = useState<Audience>("friends");
  const [inviteOpen, setInviteOpen] = useState(false);
  // Supabase feed paging. null feed = loading; demo mode uses the sample posts.
  const [next, setNext] = useState<FeedCursor | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [demoPosts, setDemoPosts] = useState<Post[]>(seedPosts);
  const seenRef = useSeenTracker();
  const sentinel = useRef<HTMLDivElement>(null);

  function setTab(t: FeedTab) {
    setTabState(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      // Private mode: the tab just isn't remembered.
    }
  }

  useEffect(() => {
    setTabState(readTab());
  }, []);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<{
    url: string;
    file: File;
    kind: MediaKind;
  } | null>(null);
  const [sharing, setSharing] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);
  const [feed, setFeed] = useState<Post[]>(seedPosts);
  const [toast, setToast] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  // Settle in: the Moment just shared on /welcome shows on top, once.
  const [firstMoment, setFirstMomentPost] = useState<Post | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [nudge, setNudge] = useState(false);
  const [composePrompt] = useState(() => pickPrompt());

  useEffect(() => {
    if (!user) return;
    setAvatarSrc(getLocalAvatar(user.id));
    setNudge(shouldNudge(user.id, user.onboardingCompletedAt));
    const m = takeFirstMoment();
    if (m && m.authorId === user.id) {
      setFirstMomentPost({ ...m, createdAt: "Just now", loves: 0, comments: 0 });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    listFollowingIds(user.id, user.followingIds ?? [])
      .then(setFollowingIds)
      .catch(() => setFollowingIds([]));
  }, [user]);

  async function toggleFollow(id: string) {
    const was = followingIds.includes(id);
    setFollowingIds((prev) =>
      was ? prev.filter((x) => x !== id) : [...prev, id],
    );
    try {
      await (was ? unfollow(id) : follow(id));
    } catch (e) {
      setFollowingIds((prev) =>
        was ? [...prev, id] : prev.filter((x) => x !== id),
      );
      showToast((e as Error).message);
    }
  }

  // Re-read localStorage block list each render (free-tier, this device).
  const blockedIds = new Set(getBlockedIds());
  // Blocked just now: fade their Moments (pins included) out, then drop them. No reload.
  const justBlocked = useJustBlocked();
  // Reported Moments disappear right away for the reporter (this device).
  // The device-only block list only applies in demo mode; with real keys the server
  // (can_see_moment) already drops anything across a block.
  // The stored copy (with counts and media) wins over the /welcome handoff once the feed has it.
  const topPost = firstMoment ? (feed.find((p) => p.id === firstMoment.id) ?? firstMoment) : null;
  const visibleFeed = feed.filter(
    (post) =>
      (mode === "supabase" || !blockedIds.has(post.authorId)) &&
      !justBlocked.gone.has(post.authorId) &&
      !reportedIds.includes(post.id) &&
      post.id !== topPost?.id,
  );
  const nudgePost = nudge ? visibleFeed.find((p) => p.authorId !== user?.id) : undefined;
  const nudgeName = nudgePost
    ? (nudgePost.authorName ?? people.find((p) => p.id === nudgePost.authorId)?.name ?? "A friend").split(" ")[0]
    : "";
  const birthdays = people.filter((p) => p.birthday && !blockedIds.has(p.id));
  const suggestions = people
    .filter(
      (p) => p.id !== "u-ember" && p.id !== user?.id && !blockedIds.has(p.id),
    )
    .slice(0, 3);
  const contacts = people.filter(
    (p) => p.id !== "u-ember" && p.id !== user?.id && !blockedIds.has(p.id),
  );

  const canShare = draft.trim().length > 0 || attachment !== null;

  // First page for the current tab. Demo mode (getFeed → null) uses the sample feed.
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    getFeed(tab, null)
      .then((page) => {
        if (cancelled) return;
        if (!page) {
          setFeed(demoFeed(demoPosts, tab, user?.id, followingIds));
          setNext(null);
        } else {
          setFeed(page.moments);
          setNext(page.next);
        }
        setLoaded(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setFeed([]);
        setLoaded(true);
        showToast((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
    // followingIds/demoPosts only shape the demo feed; refetching on them is fine.
  }, [tab, user?.id, followingIds, demoPosts]);

  // Older pages: keyset on (created_at, id), 20 at a time, when the sentinel comes into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || loadingMore) return;
      setLoadingMore(true);
      getFeed(tab, next)
        .then((page) => {
          if (!page) return;
          setFeed((prev) => [
            ...prev,
            // Skip anything already loaded or pinned under "From your people".
            ...page.moments.filter((m) => !m.fromYourPeople && !prev.some((p) => p.id === m.id)),
          ]);
          setNext(page.next);
        })
        .catch(() => setNext(null))
        .finally(() => setLoadingMore(false));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [next, tab, loadingMore]);

  useEffect(() => {
    setReportedIds(getReportedIds());
  }, []);

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

  function clearAttachment() {
    setAttachment((prev) => {
      revokeIfObjectUrl(prev?.url ?? null);
      return null;
    });
  }

  function showToast(message: string, ms = 2800) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }

  // First Moment from /welcome: that page unmounts on redirect, so its toast is shown here
  // (Glow: this copy replaces "Shared to the hearth." for this one only), then the flag is dropped.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("first") !== "1") return;
    showToast("Your first Moment is by the fire.", 4000);
    params.delete("first");
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, []);

  // A skipped photo step comes back once as a soft card after Settle in is finished.
  const [photoCard, setPhotoCard] = useState(false);
  useEffect(() => {
    if (!user) return;
    const p = getProgress(user.id);
    setPhotoCard(p.done && !p.photo && !photoCardDismissed(user.id));
  }, [user]);

  function handleMediaPick(
    files: FileList | null,
    input: HTMLInputElement | null,
  ) {
    const file = files?.[0];
    if (input) input.value = "";
    if (!file) return;
    const problem = checkMedia(file);
    const kind = mediaKindOf(file);
    if (problem || !kind) {
      showToast(problem || "That file type isn’t supported.");
      return;
    }
    const url = URL.createObjectURL(file);
    setAttachment((prev) => {
      revokeIfObjectUrl(prev?.url ?? null);
      return { url, file, kind };
    });
  }

  async function handleShare() {
    if (!canShare || !user || sharing) return;
    const body =
      draft.trim() ||
      (attachment?.kind === "image"
        ? "Shared a photo by the hearth."
        : attachment?.kind === "video"
          ? "Shared a video by the hearth."
          : "");
    if (!body) return;

    setSharing(true);
    let saved: Post;
    try {
      // Supabase: upload first (photos are resized and stripped of EXIF). Demo: returns null.
      const media = attachment ? await uploadMedia(attachment.file) : null;
      saved = await createMoment({
        authorId: user.id,
        body,
        visibility: audience,
        media,
      });
    } catch (err) {
      setSharing(false);
      showToast(
        err instanceof Error && err.message
          ? err.message
          : "Couldn’t share that — try again.",
      );
      return;
    }
    setSharing(false);
    // Demo mode (or before a signed URL is ready): keep the local preview on the card.
    const next: Post =
      attachment && !saved.image && !saved.video
        ? {
            ...saved,
            ...(attachment.kind === "image"
              ? { image: attachment.url }
              : { video: attachment.url }),
          }
        : saved;

    if (mode !== "supabase") setDemoPosts((prev) => [next, ...prev]);
    else setFeed((prev) => [next, ...prev]);
    setDraft("");
    updateProgress(user.id, { moment: true });
    // Keep a local object URL alive for the feed card; only clear composer state.
    if (next.image === attachment?.url || next.video === attachment?.url)
      setAttachment(null);
    else clearAttachment();
    showToast("Shared to the hearth.");
  }

  // "From your people" first (first page only), then the rest, newest first, without repeats.
  const pinned = visibleFeed.filter((p) => p.fromYourPeople);
  // Nothing shows twice: skip ids pinned above, and repeats within the list.
  const pinnedIds = new Set(pinned.map((p) => p.id));
  const listed = new Set<string>();
  const rest = visibleFeed.filter((p) => {
    if (p.fromYourPeople || pinnedIds.has(p.id) || listed.has(p.id)) return false;
    listed.add(p.id);
    return true;
  });

  function renderCard(post: Post, slot: "pin" | "list") {
    return (
      <div
        key={`${slot}-${post.id}`}
        ref={seenRef(post.id)}
        data-moment={post.id}
        className={cn("transition-opacity duration-300", justBlocked.fading.has(post.authorId) && "opacity-0")}
      >
        <PostCard
          post={post}
          onEdit={async (id, body) => {
            const previousBody = feed.find((p) => p.id === id)?.body;
            setFeed((prev) =>
              prev.map((p) => (p.id === id ? { ...p, body } : p)),
            );
            try {
              await updateMoment(id, body);
            } catch {
              // Revert only this Moment, keeping anything else that changed meanwhile.
              if (previousBody !== undefined) {
                setFeed((prev) =>
                  prev.map((p) =>
                    p.id === id ? { ...p, body: previousBody } : p,
                  ),
                );
              }
              showToast("Couldn’t save that edit — try again.");
            }
          }}
          onReported={(id) =>
            setReportedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
          }
          onDelete={async (id) => {
            const index = feed.findIndex((p) => p.id === id);
            const removed = feed[index];
            setFeed((prev) => prev.filter((p) => p.id !== id));
            setDemoPosts((prev) => prev.filter((p) => p.id !== id));
            try {
              await deleteMoment(id);
              showToast("Moment deleted.");
            } catch {
              // Put back only this Moment, near where it was.
              if (removed) {
                setFeed((prev) =>
                  prev.some((p) => p.id === id)
                    ? prev
                    : [...prev.slice(0, index), removed, ...prev.slice(index)],
                );
              }
              showToast("Couldn’t delete that — try again.");
            }
          }}
        />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <OnboardingChecklist />
          {photoCard && user && (
            <div className="relative flex items-center gap-3 rounded-3xl bg-cream-50 p-4 pr-10 ring-1 ring-cream-200">
              <Link href="/welcome" className="text-sm text-ink-700 hover:text-ink-900">
                Add a photo so friends recognize you.
              </Link>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => {
                  dismissPhotoCard(user.id);
                  setPhotoCard(false);
                }}
                className="absolute right-3 top-3 rounded-full p-1 text-ink-400 hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {nudgePost && user && (
            <section className="flex items-center gap-3 rounded-3xl bg-cream-50 p-4 ring-1 ring-cream-200">
              <p className="flex-1 text-sm text-ink-700">{nudgeName} shared a Moment — say hi?</p>
              <button
                type="button"
                onClick={() => {
                  document.querySelector(`[data-moment="${nudgePost.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  dismissNudge(user.id);
                  setNudge(false);
                }}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-ember-700 ring-1 ring-ember-glow hover:bg-ember-50"
              >
                Say hi
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissNudge(user.id);
                  setNudge(false);
                }}
                className="rounded-full p-1.5 text-ink-400 hover:bg-cream-100 hover:text-ink-700"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </section>
          )}

          <section className="rounded-3xl border border-ink-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name || "You"} src={avatarSrc} />
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
                placeholder={
                  compose ? composePrompt : "What is on your mind?"
                }
                className="w-full rounded-full border-0 bg-cream-100 px-4 py-3 text-sm placeholder:text-ink-400 focus:ring-2 focus:ring-ember-300"
                aria-label="Compose a post"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                aria-pressed={attachment?.kind === "image"}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm hover:bg-cream-100",
                  attachment?.kind === "image"
                    ? "bg-cream-100 font-medium text-ink-800 ring-1 ring-ember-300"
                    : "text-ink-600",
                )}
              >
                <ImageIcon className="h-4 w-4 text-ember-500" /> Photo
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) =>
                  handleMediaPick(e.target.files, photoInputRef.current)
                }
              />
              {mode === "supabase" ? (
                // Video is off for real accounts until its metadata can be stripped server-side.
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Coming soon"
                  // Same look as Feeling.
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-ink-600 hover:bg-cream-100"
                >
                  <Video className="h-4 w-4 text-ember-500" /> Video · Coming
                  soon
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  aria-pressed={attachment?.kind === "video"}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm hover:bg-cream-100",
                    attachment?.kind === "video"
                      ? "bg-cream-100 font-medium text-ink-800 ring-1 ring-ember-300"
                      : "text-ink-600",
                  )}
                >
                  <Video className="h-4 w-4 text-ember-500" /> Video
                </button>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) =>
                  handleMediaPick(e.target.files, videoInputRef.current)
                }
              />
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-ink-600 hover:bg-cream-100"
              >
                <Smile className="h-4 w-4 text-ember-500" /> Feeling
              </button>
            </div>
            {attachment?.kind === "image" && (
              <div className="mt-3">
                <div className="relative inline-block rounded-2xl bg-cream-100 p-1 ring-1 ring-ink-100/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachment.url}
                    alt="Selected photo preview"
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearAttachment}
                    aria-label="Remove photo"
                    className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cream-50 text-ink-600 shadow-soft ring-1 ring-ink-100 transition hover:bg-cream-100 hover:text-ink-900"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              </div>
            )}
            {attachment?.kind === "video" && (
              <p className="mt-2 flex items-center gap-2 text-xs text-ink-500">
                Video attached ·{" "}
                {(attachment.file.size / (1024 * 1024)).toFixed(1)} MB
                <button
                  type="button"
                  onClick={clearAttachment}
                  className="underline underline-offset-2 hover:text-ink-800"
                >
                  Remove
                </button>
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <AudienceChip value={audience} onChange={setAudience} />
              <button
                type="button"
                onClick={handleShare}
                disabled={!canShare || sharing}
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
          </section>

          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                aria-pressed={tab === t.value}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition",
                  tab === t.value
                    ? "bg-ember-100 font-medium text-ember-700"
                    : "text-ink-500 hover:bg-cream-100 hover:text-ink-700",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {topPost && renderCard(topPost, "pin")}

          {loaded && visibleFeed.length === 0 && !topPost && (
            <section className="flex flex-col items-center gap-3 rounded-2xl bg-cream-50 px-4 py-10 text-center ring-1 ring-cream-200">
              <HearthDrawing lit={false} />
              <p className="text-sm font-medium text-ink-700">
                Your hearth is quiet.
              </p>
              <Link
                href="/people"
                className="rounded-full bg-ember-glow px-5 py-2 text-sm font-medium text-white transition hover:brightness-95"
              >
                Find people
              </Link>
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="text-xs text-ink-500 underline-offset-2 hover:text-ink-800 hover:underline"
              >
                Invite someone
              </button>
            </section>
          )}

          {pinned.length > 0 && (
            <section aria-labelledby="from-your-people">
              <h2
                id="from-your-people"
                className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-500"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-ember-glow"
                  aria-hidden
                />
                From your people
              </h2>
              <div className="space-y-4">
                {pinned.map((post) => renderCard(post, "pin"))}
              </div>
              <hr className="mt-4 border-cream-200" />
            </section>
          )}

          {pinned.length > 0 && (
            <section className="rounded-2xl bg-cream-50 py-6 text-center ring-1 ring-cream-200">
              <div className="flex justify-center">
                <HearthDrawing />
              </div>
              <p className="mt-2 text-sm font-medium text-ink-700">
                You’re all caught up
              </p>
              <p className="text-xs text-ink-500">Older Moments are below.</p>
            </section>
          )}

          {rest.map((post) => renderCard(post, "list"))}

          {next && <div ref={sentinel} className="h-8" aria-hidden />}
          {loadingMore && (
            <p className="text-center text-xs text-ink-400">
              Loading older Moments…
            </p>
          )}

          <div className="h-16" aria-hidden />

          <div className="sticky bottom-4 z-20 pt-2">
            <Link
              href="/clips"
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-cream-100 text-ink-800 shadow-[0_4px_24px_rgba(26,26,24,0.12)] ring-1 ring-ink-100/80 transition hover:bg-cream-50 hover:shadow-[0_6px_28px_rgba(26,26,24,0.14)] active:scale-[0.99]"
            >
              <HearthMark className="text-ink-900" />
              <span className="text-[15px] font-medium tracking-tight">
                Watch Clips
              </span>
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
                  <p className="text-sm text-ink-700">
                    <span className="font-medium">{p.name}</span> · {p.birthday}
                  </p>
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
                    <p className="truncate text-sm font-medium text-ink-800">
                      {p.name}
                    </p>
                    <p className="text-xs text-ink-400">{p.mutuals} mutuals</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    onClick={() => void toggleFollow(p.id)}
                  >
                    {followingIds.includes(p.id) ? "Following" : "Follow"}
                  </Button>
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

      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />

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
