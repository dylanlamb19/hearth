"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Reactions (Love) and comments. Supabase when configured and the Moment is stored (uuid);
 * otherwise a localStorage demo so sample posts still work.
 */
const UUID = /^[0-9a-f-]{36}$/i;
const LOVES_KEY = "hearth_loves";
const COMMENTS_KEY = "hearth_comments";

export type Comment = {
  id: string;
  momentId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

function stored(momentId: string) {
  const sb = getSupabaseBrowserClient();
  return sb && UUID.test(momentId) ? sb : null;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

// --- Reactions --------------------------------------------------------------

/** Ids of people who loved this Moment (blocked people excluded by RLS). */
export async function listLoves(momentId: string, userId?: string): Promise<string[]> {
  const sb = stored(momentId);
  if (!sb) {
    const mine = readJson<string[]>(LOVES_KEY, []).includes(momentId);
    return mine && userId ? [userId] : [];
  }
  const { data, error } = await sb.from("reactions").select("user_id").eq("moment_id", momentId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { user_id: string }) => r.user_id);
}

export async function setLove(momentId: string, on: boolean): Promise<void> {
  const sb = stored(momentId);
  if (!sb) {
    const ids = readJson<string[]>(LOVES_KEY, []).filter((id) => id !== momentId);
    writeJson(LOVES_KEY, on ? [...ids, momentId] : ids);
    return;
  }
  const { error } = on
    ? await sb.from("reactions").insert({ moment_id: momentId })
    : await sb.from("reactions").delete().eq("moment_id", momentId).eq("user_id", (await sb.auth.getUser()).data.user?.id ?? "");
  if (error && error.code !== "23505") throw new Error("Couldn’t save that. Try again?");
}

// --- Comments ---------------------------------------------------------------

type CommentRow = {
  id: string;
  moment_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: { name: string | null } | null;
};

const COMMENT_SELECT = "id, moment_id, author_id, body, created_at, author:profiles(name)";

function rowToComment(r: CommentRow): Comment {
  return {
    id: r.id,
    momentId: r.moment_id,
    authorId: r.author_id,
    authorName: r.author?.name || "Hearth member",
    body: r.body,
    createdAt: r.created_at,
  };
}

function demoComments(): Comment[] {
  return readJson<Comment[]>(COMMENTS_KEY, []);
}

export async function listComments(momentId: string): Promise<Comment[]> {
  const sb = stored(momentId);
  if (!sb) return demoComments().filter((c) => c.momentId === momentId);
  const { data, error } = await sb
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("moment_id", momentId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as CommentRow[]).map(rowToComment);
}

export async function addComment(
  momentId: string,
  body: string,
  author: { id: string; name: string },
): Promise<Comment> {
  const text = body.trim().slice(0, 1000);
  if (!text) throw new Error("Write something first.");
  const sb = stored(momentId);
  if (!sb) {
    const c: Comment = {
      id: `local-c-${Date.now()}`,
      momentId,
      authorId: author.id,
      authorName: author.name,
      body: text,
      createdAt: new Date().toISOString(),
    };
    writeJson(COMMENTS_KEY, [...demoComments(), c]);
    return c;
  }
  const { data, error } = await sb.from("comments").insert({ moment_id: momentId, body: text }).select(COMMENT_SELECT).single();
  if (error || !data) throw new Error("Couldn’t post that comment. Try again?");
  return rowToComment(data as unknown as CommentRow);
}

/** Soft delete. Allowed for the comment's author or the Moment's author. */
export async function deleteComment(comment: Comment): Promise<void> {
  const sb = stored(comment.momentId);
  if (!sb || !UUID.test(comment.id)) {
    writeJson(COMMENTS_KEY, demoComments().filter((c) => c.id !== comment.id));
    return;
  }
  const { error } = await sb.rpc("delete_comment", { comment_id: comment.id });
  if (error) throw new Error("Couldn’t delete that comment. Try again?");
}
