"use client";

import { useCallback, useEffect, useState } from "react";
import { Images, X } from "lucide-react";
import type { Post } from "@/data/seed";
import { PostCard } from "@/components/PostCard";
import { useAuth } from "@/components/AuthProvider";
import { listProfilePhotos } from "@/lib/photos";
import { deleteMoment } from "@/lib/moments";

/**
 * Photos tab on a profile: a 3-column grid of images from this person's Moments that the
 * viewer can see. Tapping one opens that Moment (with its report, block and delete menu).
 * Owners see a gentle empty state; visitors don't see the section when it's empty.
 */
export function ProfilePhotos({ uid, isOwner }: { uid: string; isOwner: boolean }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Post[] | null>(null);
  const [open, setOpen] = useState<Post | null>(null);

  useEffect(() => {
    let live = true;
    listProfilePhotos(uid, Boolean(user))
      .then((list) => live && setPhotos(list))
      .catch(() => live && setPhotos([]));
    return () => {
      live = false;
    };
  }, [uid, user]);

  const close = useCallback(() => setOpen(null), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const drop = (id: string) => {
    setPhotos((list) => (list ? list.filter((p) => p.id !== id) : list));
    setOpen(null);
  };

  if (photos === null) return null;
  if (photos.length === 0 && !isOwner) return null;

  return (
    <section className="mt-6 space-y-3" aria-labelledby="profile-photos-heading">
      <h2 id="profile-photos-heading" className="font-medium text-ink-900">
        Photos
      </h2>
      {photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-ink-200 bg-cream-50 px-6 py-10 text-center">
          <Images strokeWidth={1.75} className="h-8 w-8 text-ember-500" aria-hidden />
          <p className="text-sm text-ink-600">Photos from your Moments will gather here.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-2xl">
          {photos.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOpen(p)}
                className="group relative block aspect-square w-full overflow-hidden bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
                aria-label={p.body ? `Open Moment: ${p.body.slice(0, 80)}` : "Open Moment"}
              >
                {/* Signed, short-lived Storage URLs: plain img, no optimizer cache. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.body ? p.body.slice(0, 120) : "Photo from a Moment"}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-150 group-hover:opacity-90"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Moment"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-cream-50 p-3 shadow-card sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-full p-2 text-ink-600 hover:bg-cream-100 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
                aria-label="Close"
              >
                <X strokeWidth={1.75} className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <PostCard
              post={open}
              onReported={drop}
              {...(isOwner
                ? {
                    onDelete: (id: string) => {
                      void deleteMoment(id).finally(() => drop(id));
                    },
                  }
                : {})}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
