/** Demo saved posts — stored in localStorage on this device. */
import type { Post } from "@/data/seed";

export const SAVED_KEY = "hearth_saved";

export type SavedEntry = { id: string; savedAt: number; post: Post };

export function getSavedEntries(): SavedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SavedEntry =>
        !!e && typeof e.id === "string" && typeof e.savedAt === "number" && !!e.post,
    );
  } catch {
    return [];
  }
}

/** Saved posts, newest save first. */
export function getSavedPosts(): Post[] {
  return getSavedEntries()
    .sort((a, b) => b.savedAt - a.savedAt)
    .map((e) => e.post);
}

export function isSaved(postId: string): boolean {
  return getSavedEntries().some((e) => e.id === postId);
}

function write(entries: SavedEntry[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Save a post (idempotent). Returns the updated list. */
export function addSaved(post: Post): SavedEntry[] {
  const rest = getSavedEntries().filter((e) => e.id !== post.id);
  const next = [...rest, { id: post.id, savedAt: Date.now(), post }];
  write(next);
  return next;
}

/** Remove a saved post. Returns the updated list. */
export function removeSaved(postId: string): SavedEntry[] {
  const next = getSavedEntries().filter((e) => e.id !== postId);
  write(next);
  return next;
}

/** Toggle; returns true when the post is now saved. */
export function toggleSaved(post: Post): boolean {
  if (isSaved(post.id)) {
    removeSaved(post.id);
    return false;
  }
  addSaved(post);
  return true;
}
