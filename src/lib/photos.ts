"use client";

import { posts as seedPosts, type Post } from "@/data/seed";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signMediaPaths } from "@/lib/media";
import { timeAgo } from "@/lib/format";

/**
 * Profile Photos tab: images from one person's own Moments, newest first.
 *
 * No new policy. The `moments` select policy (0010) is `can_see_moment(id)`, which already
 * covers deleted rows, hidden-pending-review, blocks in both directions, and the friends /
 * everyone audience. Storage only signs media attached to a Moment the reader can see (0004).
 * Signed-out visitors have no select grant on `moments`, so they get nothing.
 */
const PHOTO_LIMIT = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PhotoRow = {
  id: string;
  author_id: string;
  body: string;
  visibility: Post["privacy"];
  created_at: string;
  media_path: string | null;
  author: { name: string | null; handle: string | null } | null;
};

export async function listProfilePhotos(uid: string, signedIn: boolean): Promise<Post[]> {
  const sb = getSupabaseBrowserClient();
  // Demo mode: seed Moments that carry a photo.
  if (!sb) return seedPosts.filter((p) => p.authorId === uid && Boolean(p.image));
  // Never query for signed-out visitors or non-stored ids (seed people aren't in the database).
  if (!signedIn || !UUID.test(uid)) return [];

  const { data, error } = await sb
    .from("moments")
    .select(
      "id, author_id, body, visibility, created_at, media_path, author:profiles!moments_author_id_fkey(name, handle)",
    )
    .eq("author_id", uid)
    .eq("media_type", "image")
    .eq("is_demo", false)
    .not("media_path", "is", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PHOTO_LIMIT);
  if (error || !data) return [];

  const rows = data as unknown as PhotoRow[];
  const urls = await signMediaPaths(rows.map((r) => r.media_path).filter((p): p is string => Boolean(p)));
  // A row whose file Storage refused to sign is dropped rather than shown broken.
  return rows
    .filter((r) => r.media_path && urls[r.media_path])
    .map((r) => ({
      id: r.id,
      authorId: r.author_id,
      body: r.body,
      createdAt: timeAgo(r.created_at),
      createdAtIso: r.created_at,
      loves: 0,
      comments: 0,
      privacy: r.visibility,
      mediaPath: r.media_path as string,
      image: urls[r.media_path as string],
      ...(r.author?.name ? { authorName: r.author.name, authorHandle: r.author.handle ?? "" } : {}),
    }));
}
