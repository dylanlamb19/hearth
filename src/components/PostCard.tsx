"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Heart, MessageCircle, Share2, Bookmark, Globe2, Users, MoreHorizontal, Link2, Trash2 } from "lucide-react";
import { Post, personById, reactionsForPost } from "@/data/seed";
import { Avatar } from "./Avatar";
import { ReportMenu } from "./ReportMenu";
import { ReactionsSheet } from "./ReactionsSheet";
import { useAuth } from "./AuthProvider";
import { useLoved } from "@/lib/loves";

function isLocalMediaUrl(src: string) {
  return src.startsWith("blob:") || src.startsWith("data:");
}

export function PostCard({ post, onDelete }: { post: Post; onDelete?: (postId: string) => void }) {
  const { user } = useAuth();
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seedAuthor = personById(post.authorId);
  const author =
    seedAuthor ??
    (user && post.authorId === user.id
      ? {
          id: user.id,
          name: user.name,
          handle: user.handle,
          bio: user.bio || "",
          mutuals: 0,
          online: true,
        }
      : null);

  const seedReactions = reactionsForPost(post.id);
  const meId = user?.id ?? "";
  const seedLoved = Boolean(meId) && seedReactions.some((r) => r.emoji === "❤️" && r.personId === meId);
  const [loved, toggleLoved] = useLoved(post.id, seedLoved);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  if (!author) return null;

  const isOwnPost = Boolean(user && post.authorId === user.id);
  const others = seedReactions.filter((r) => !(r.emoji === "❤️" && r.personId === meId));
  const reactions = loved && meId ? [{ emoji: "❤️", personId: meId }, ...others] : others;
  const loveCount = reactions.filter((r) => r.emoji === "❤️").length;

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  async function handleShareClick() {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/home#${post.id}`
        : `/home#${post.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Link copied");
    } catch {
      showToast("Sharing soon");
    }
  }

  const peopleWithMe = (id: string) =>
    personById(id) ??
    (user && id === user.id
      ? { id: user.id, name: user.name, handle: user.handle, bio: "", mutuals: 0, online: true }
      : undefined);

  return (
    <article id={post.id} className="rounded-3xl border border-ink-100 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={author.name} online={author.online} />
          <div>
            <p className="font-medium text-ink-900">{author.name}</p>
            <p className="flex items-center gap-1 text-xs text-ink-400">
              {post.createdAt}
              <span aria-hidden>·</span>
              {post.privacy === "public" ? <Globe2 className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
            </p>
          </div>
        </div>
        {isOwnPost ? (
          <OwnPostMenu onCopyLink={handleShareClick} onDelete={() => onDelete?.(post.id)} canDelete={Boolean(onDelete)} />
        ) : (
          <ReportMenu subject={author.name} subjectId={author.id} />
        )}
      </div>

      {post.image && (
        <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-2xl bg-cream-200">
          {isLocalMediaUrl(post.image) ? (
            // Client-only object/data URLs from the composer — native img avoids next/image host checks.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Image src={post.image} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 640px" unoptimized />
          )}
        </div>
      )}

      <p className="mt-4 text-[15px] leading-relaxed text-ink-800">{post.body}</p>

      <div className="mt-4 flex flex-wrap items-center gap-1 text-sm text-ink-500">
        <span className="inline-flex items-center rounded-full">
          <button
            type="button"
            aria-pressed={loved}
            aria-label={loved ? "Remove your Love" : "Love"}
            onClick={toggleLoved}
            className={`inline-flex items-center gap-1.5 rounded-l-full py-1.5 pl-3 pr-1.5 hover:bg-cream-100 ${loved ? "text-amber-600" : ""}`}
          >
            <Heart className="h-4 w-4" fill={loved ? "currentColor" : "none"} /> Love
          </button>
          <button
            type="button"
            aria-label={`View ${loveCount} reactions`}
            onClick={() => setReactionsOpen(true)}
            className="rounded-r-full py-1.5 pl-1 pr-3 hover:bg-cream-100"
          >
            · {loveCount}
          </button>
        </span>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-cream-100">
          <MessageCircle className="h-4 w-4" /> Comment · {post.comments}
        </button>
        <button
          type="button"
          onClick={handleShareClick}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-cream-100"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-cream-100">
          <Bookmark className="h-4 w-4" /> Save
        </button>
      </div>

      <ReactionsSheet
        open={reactionsOpen}
        onClose={() => setReactionsOpen(false)}
        reactions={reactions}
        peopleById={peopleWithMe}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-ink-100 bg-cream-50 px-4 py-2 text-sm text-ink-800 shadow-soft"
        >
          {toast}
        </div>
      )}
    </article>
  );
}

/** ··· on your own Moments: Copy link and Delete only — nobody reports or blocks themselves. */
function OwnPostMenu({
  onCopyLink,
  onDelete,
  canDelete,
}: {
  onCopyLink: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !confirming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setConfirming(false);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (open && rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, confirming]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-1.5 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-2xl border border-ink-100 bg-cream-50 shadow-card">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ink-700 hover:bg-cream-100"
            onClick={() => {
              setOpen(false);
              onCopyLink();
            }}
          >
            <Link2 className="h-4 w-4 text-ink-500" /> Copy link
          </button>
          {canDelete && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ink-700 hover:bg-cream-100"
              onClick={() => {
                setOpen(false);
                setConfirming(true);
              }}
            >
              <Trash2 className="h-4 w-4 text-ink-500" /> Delete
            </button>
          )}
        </div>
      )}
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/30 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setConfirming(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-moment-title"
            className="w-full max-w-sm rounded-t-3xl border border-ink-100 bg-cream-50 px-5 py-5 shadow-soft sm:rounded-3xl sm:px-6 sm:py-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-moment-title" className="font-display text-xl text-ink-900">
              Delete this Moment?
            </h2>
            <p className="mt-2 text-sm text-ink-600">It’ll be gone for everyone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-ink-800 ring-1 ring-ink-100 hover:bg-cream-100"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  onDelete();
                }}
                className="rounded-full px-4 py-2.5 text-sm text-ink-600 underline-offset-2 hover:text-ink-900 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
