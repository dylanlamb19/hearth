"use client";

import type { Post } from "@/data/seed";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/format";

/**
 * Moments data layer. With Supabase configured, Moments live in the `moments` table
 * (0003_moments.sql). Without it, the demo keeps them in memory for this tab, exactly
 * like the composer did before.
 */
export type NewMoment = { authorId: string; body: string; visibility: Post["privacy"] };

type MomentRow = {
  id: string;
  author_id: string;
  body: string;
  visibility: Post["privacy"];
  created_at: string;
  author: { name: string | null; handle: string | null } | null;
};

function rowToPost(row: MomentRow): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    body: row.body,
    createdAt: timeAgo(row.created_at),
    loves: 0,
    comments: 0,
    privacy: row.visibility,
    ...(row.author?.name ? { authorName: row.author.name, authorHandle: row.author.handle ?? "" } : {}),
  };
}

const SELECT = "id, author_id, body, visibility, created_at, author:profiles(name, handle)";

/** Your stored Moments plus public ones, newest first. Empty in demo mode (seed posts cover the feed). */
export async function listMoments(): Promise<Post[]> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("moments")
    .select(SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return (data as unknown as MomentRow[]).map(rowToPost);
}

export async function createMoment(input: NewMoment): Promise<Post> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { data, error } = await sb
      .from("moments")
      .insert({ author_id: input.authorId, body: input.body, visibility: input.visibility })
      .select(SELECT)
      .single();
    if (error || !data) throw new Error(error?.message || "Could not share that Moment.");
    return rowToPost(data as unknown as MomentRow);
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

/** Soft delete: sets deleted_at so the row drops out of every feed. */
export async function deleteMoment(id: string): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb || !isStored(id)) return;
  const { error } = await sb.from("moments").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}
