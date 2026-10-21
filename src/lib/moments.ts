"use client";

import type { Post } from "@/data/seed";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/format";
import { signMediaPaths, type UploadedMedia } from "@/lib/media";

/**
 * Moments data layer. With Supabase configured, Moments live in the `moments` table
 * (0003_moments.sql). Without it, the demo keeps them in memory for this tab, exactly
 * like the composer did before.
 */
export type NewMoment = {
  authorId: string;
  body: string;
  visibility: Post["privacy"];
  media?: UploadedMedia | null;
};

type MomentRow = {
  id: string;
  author_id: string;
  body: string;
  visibility: Post["privacy"];
  created_at: string;
  is_demo: boolean;
  media_path: string | null;
  media_type: "image" | "video" | null;
  author: { name: string | null; handle: string | null } | null;
};

function rowToPost(row: MomentRow, urls: Record<string, string> = {}): Post {
  const url = row.media_path ? urls[row.media_path] : undefined;
  return {
    id: row.id,
    authorId: row.author_id,
    body: row.body,
    createdAt: timeAgo(row.created_at),
    loves: 0,
    comments: 0,
    privacy: row.visibility,
    ...(row.media_path ? { mediaPath: row.media_path } : {}),
    ...(url && row.media_type === "image" ? { image: url } : {}),
    ...(url && row.media_type === "video" ? { video: url } : {}),
    ...(row.author?.name ? { authorName: row.author.name, authorHandle: row.author.handle ?? "" } : {}),
  };
}

const SELECT =
  "id, author_id, body, visibility, is_demo, created_at, media_path, media_type, author:profiles(name, handle)";

async function withUrls(rows: MomentRow[]): Promise<Post[]> {
  const urls = await signMediaPaths(rows.map((r) => r.media_path).filter((p): p is string => Boolean(p)));
  return rows.map((r) => rowToPost(r, urls));
}

export type MomentList = {
  moments: Post[];
  /** True once there are real (non-demo) Moments; the feed then hides demo and seed content. */
  hasReal: boolean;
};

// RLS hides deleted rows; deleted_at isn't readable by the client, so it never appears in queries.
/** Your stored Moments plus public ones, newest first. Empty in demo mode (seed posts cover the feed). */
export async function listMoments(): Promise<MomentList> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return { moments: [], hasReal: false };
  const { data, error } = await sb
    .from("moments")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return { moments: [], hasReal: false };
  const rows = data as unknown as MomentRow[];
  const real = rows.filter((r) => !r.is_demo);
  // Demo rows only fill an empty room; once real Moments exist they step aside.
  return real.length > 0
    ? { moments: await withUrls(real), hasReal: true }
    : { moments: await withUrls(rows), hasReal: false };
}

export async function createMoment(input: NewMoment): Promise<Post> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { data, error } = await sb
      .from("moments")
      .insert({
        author_id: input.authorId,
        body: input.body,
        visibility: input.visibility,
        media_path: input.media?.path ?? null,
      })
      .select(SELECT)
      .single();
    if (error || !data) throw new Error(error?.message || "Could not share that Moment.");
    return (await withUrls([data as unknown as MomentRow]))[0];
  }
  return {
    id: `local-${Date.now()}`,
    authorId: input.authorId,
    body: input.body,
    createdAt: "Just now",
    loves: 0,
    comments: 0,
    privacy: input.visibility,
  };
}

/** Demo-only ids (seed posts, local-*) aren't in the database, so they only change in memory. */
function isStored(id: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(id);
}

export async function updateMoment(id: string, body: string): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb || !isStored(id)) return;
  const { error } = await sb.from("moments").update({ body }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Soft delete via /api/moments/delete (delete_moment RPC + file removal; RLS then hides the row from everyone). */
export async function deleteMoment(id: string): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb || !isStored(id)) return;
  // The server route deletes as you (delete_moment) and then removes the file with the admin client.
  const res = await fetch("/api/moments/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Couldn’t delete that Moment.");
}

// --- Feed (#29) ---------------------------------------------------------------

export type FeedTab = "all" | "friends" | "following";
export type FeedCursor = { at: string; id: string };
export type FeedPage = { moments: Post[]; next: FeedCursor | null };

type FeedRow = {
  id: string;
  author_id: string;
  author_name: string | null;
  author_handle: string | null;
  body: string;
  visibility: Post["privacy"];
  created_at: string;
  media_path: string | null;
  media_type: "image" | "video" | null;
  reaction_count: number;
  comment_count: number;
  my_reaction: string | null;
  from_your_people: boolean;
};

export const FEED_PAGE_SIZE = 20;

/**
 * One page of the feed via get_feed (audience, blocks and removals are enforced there).
 * Returns null in demo mode so the caller uses the sample feed.
 */
export async function getFeed(tab: FeedTab, cursor: FeedCursor | null): Promise<FeedPage | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_feed", {
    tab,
    cursor_at: cursor?.at ?? null,
    cursor_id: cursor?.id ?? null,
  });
  if (error) throw new Error("Couldn’t load your feed right now.");
  const rows = (data ?? []) as FeedRow[];
  const urls = await signMediaPaths(rows.map((r) => r.media_path).filter((p): p is string => Boolean(p)));
  const moments = rows.map((r) => ({
    ...rowToPost(
      {
        id: r.id,
        author_id: r.author_id,
        body: r.body,
        visibility: r.visibility,
        created_at: r.created_at,
        is_demo: false,
        media_path: r.media_path,
        media_type: r.media_type,
        author: { name: r.author_name, handle: r.author_handle },
      },
      urls,
    ),
    loves: r.reaction_count,
    comments: r.comment_count,
    fromYourPeople: r.from_your_people,
    createdAtIso: r.created_at,
  }));
  const list = rows.filter((r) => !r.from_your_people);
  const last = list[list.length - 1];
  return { moments, next: list.length === FEED_PAGE_SIZE && last ? { at: last.created_at, id: last.id } : null };
}

const SEEN_DEMO_KEY = "hearth_seen_demo";

export function demoSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SEEN_DEMO_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

/** Batched seen writes (private, server-only moment_views). Demo: localStorage. */
export async function markSeen(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const sb = getSupabaseBrowserClient();
  const stored = ids.filter(isStored);
  if (!sb) {
    const all = new Set([...demoSeenIds(), ...ids]);
    localStorage.setItem(SEEN_DEMO_KEY, JSON.stringify([...all].slice(-500)));
    return;
  }
  for (let i = 0; i < stored.length; i += 50) {
    const { error } = await sb.rpc("mark_moments_seen", { ids: stored.slice(i, i + 50) });
    if (error) return; // Rate-limited or offline: seen is best-effort.
  }
}
