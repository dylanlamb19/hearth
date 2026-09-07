"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Heart, MessageCircle, Share2, Bookmark, Globe2, Users } from "lucide-react";
import { Post, personById, reactionsForPost } from "@/data/seed";
import { Avatar } from "./Avatar";
import { ReportMenu } from "./ReportMenu";
import { ReactionsSheet } from "./ReactionsSheet";
import { useAuth } from "./AuthProvider";

function isLocalMediaUrl(src: string) {
  return src.startsWith("blob:") || src.startsWith("data:");
}

export function PostCard({ post }: { post: Post }) {
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

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  if (!author) return null;

  const reactions = reactionsForPost(post.id);
  const loveCount = reactions.length;

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
        <ReportMenu subject={author.name} subjectId={author.id} />
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
        <button
          type="button"
          aria-label={`View ${loveCount} reactions`}
          onClick={() => setReactionsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-cream-100"
        >
          <Heart className="h-4 w-4" /> Love · {loveCount}
        </button>
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
        peopleById={personById}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900/90 px-4 py-2 text-sm text-cream-50 shadow-soft"
        >
          {toast}
        </div>
      )}
    </article>
  );
}
