"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Reactions and comments. Supabase when configured and the Moment is stored (uuid);
 * otherwise a localStorage demo so sample posts still work.
 */
const UUID = /^[0-9a-f-]{36}$/i;
const REACTIONS_KEY = "hearth_reactions";
const COMMENTS_KEY = "hearth_comments";

import { REACTION_KINDS, REACTION_LABEL, type ReactionKind } from "@/lib/reactionKinds";

export { REACTION_KINDS, REACTION_LABEL, type ReactionKind };

export type Reaction = { userId: string; kind: ReactionKind; name?: string };

export type Comment = {
  id: string;
  momentId: string;
  parentId: string | null;
  /** null for a removed comment kept as a placeholder because it has replies. */
  authorId: string | null;
  authorName: string | null;
  body: string | null;
  deleted: boolean;
  createdAt: string;
  loveCount: number;
  lovedByMe: boolean;
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

/** Reactions on a Moment (blocked people excluded by RLS). Demo: only your own, per device. */
export async function listReactions(momentId: string, userId?: string): Promise<Reaction[]> {
  const sb = stored(momentId);
  if (!sb) {
    const kind = readJson<Record<string, ReactionKind>>(REACTIONS_KEY, {})[momentId];
    return kind && userId ? [{ userId, kind }] : [];
  }
  const { data, error } = await sb
    .from("reactions")
    .select("user_id, kind, created_at, profile:profiles!reactions_user_id_fkey(name)")
    .eq("moment_id", momentId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as { user_id: string; kind: ReactionKind; profile: { name: string | null } | null }[]).map(
    (r) => ({ userId: r.user_id, kind: r.kind, name: r.profile?.name ?? undefined }),
  );
}

/** Set your reaction (null removes it). One per person per Moment. */
export async function setReaction(momentId: string, userId: string, kind: ReactionKind | null): Promise<void> {
  const sb = stored(momentId);
  if (!sb) {
    const all = readJson<Record<string, ReactionKind>>(REACTIONS_KEY, {});
    if (kind) all[momentId] = kind;
    else delete all[momentId];
    writeJson(REACTIONS_KEY, all);
    return;
  }
  // No update grant: replace by delete + insert.
  const { error: delError } = await sb.from("reactions").delete().eq("moment_id", momentId).eq("user_id", userId);
  if (delError) throw new Error("Couldn’t save that. Try again?");
  if (!kind) return;
  const { error } = await sb.from("reactions").insert({ moment_id: momentId, kind });
  if (error && error.code !== "23505") throw new Error("Couldn’t save that. Try again?");
}

// --- Comments ---------------------------------------------------------------

type CommentRow = {
  id: string;
  parent_id: string | null;
  author_id: string | null;
  author_name: string | null;
  body: string | null;
  deleted: boolean;
  created_at: string;
  love_count: number | null;
  loved_by_me: boolean | null;
};

function demoComments(): Comment[] {
  return readJson<Comment[]>(COMMENTS_KEY, []).map((c) => ({
    ...c,
    parentId: c.parentId ?? null,
    deleted: !!c.deleted,
    loveCount: c.loveCount ?? 0,
    lovedByMe: !!c.lovedByMe,
  }));
}

/** Demo: same placeholder rule as the server (removed + has replies → placeholder). */
function demoThread(momentId: string): Comment[] {
  const all = demoComments().filter((c) => c.momentId === momentId);
  return all
    .filter((c) => !c.deleted || all.some((r) => r.parentId === c.id && !r.deleted))
    .map((c) => (c.deleted ? { ...c, authorId: null, authorName: null, body: null, loveCount: 0, lovedByMe: false } : c));
}

export async function listComments(momentId: string): Promise<Comment[]> {
  const sb = stored(momentId);
  if (!sb) return demoThread(momentId);
  const { data, error } = await sb.rpc("list_comments", { target: momentId });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CommentRow[]).map((r) => ({
    id: r.id,
    momentId,
    parentId: r.parent_id,
    authorId: r.author_id,
    authorName: r.deleted ? null : r.author_name || "Hearth member",
    body: r.body,
    deleted: r.deleted,
    createdAt: r.created_at,
    loveCount: r.love_count ?? 0,
    lovedByMe: !!r.loved_by_me,
  }));
}

export async function addComment(
  momentId: string,
  body: string,
  author: { id: string; name: string },
  parentId: string | null = null,
): Promise<Comment> {
  const text = body.trim().slice(0, 1000);
  if (!text) throw new Error("Write something first.");
  const sb = stored(momentId);
  if (!sb) {
    const c: Comment = {
      id: `local-c-${Date.now()}`,
      momentId,
      parentId,
      authorId: author.id,
      authorName: author.name,
      body: text,
      deleted: false,
      createdAt: new Date().toISOString(),
      loveCount: 0,
      lovedByMe: false,
    };
    writeJson(COMMENTS_KEY, [...demoComments(), c]);
    return c;
  }
  const { data, error } = await sb
    .from("comments")
    .insert({ moment_id: momentId, parent_id: parentId, body: text })
    .select("id, created_at")
    .single();
  if (error || !data) {
    if (error?.message.includes("HEARTH_COMMENT_LIMIT")) {
      throw new Error("That’s a lot of comments. Take a breather and try again in a few minutes.");
    }
    throw new Error("Couldn’t post that comment. Try again?");
  }
  const row = data as { id: string; created_at: string };
  return { id: row.id, momentId, parentId, authorId: author.id, authorName: author.name, body: text, deleted: false, createdAt: row.created_at, loveCount: 0, lovedByMe: false };
}

/** Soft delete. Allowed for the comment's author or the Moment's author. No editing (follow-up). */
export async function deleteComment(comment: Comment): Promise<void> {
  const sb = stored(comment.momentId);
  if (!sb || !UUID.test(comment.id)) {
    writeJson(COMMENTS_KEY, demoComments().map((c) => (c.id === comment.id ? { ...c, deleted: true } : c)));
    return;
  }
  const { error } = await sb.rpc("delete_comment", { comment_id: comment.id });
  if (error) throw new Error("Couldn’t delete that comment. Try again?");
}

/** Love or un-love a comment. Returns whether you love it now. Demo: stored locally. */
export async function toggleCommentLove(comment: Comment): Promise<boolean> {
  const sb = stored(comment.momentId);
  if (!sb || !UUID.test(comment.id)) {
    let now = !comment.lovedByMe;
    writeJson(
      COMMENTS_KEY,
      demoComments().map((c) => {
        if (c.id !== comment.id) return c;
        now = !c.lovedByMe;
        return { ...c, lovedByMe: now, loveCount: Math.max(0, c.loveCount + (now ? 1 : -1)) };
      }),
    );
    return now;
  }
  const { data, error } = await sb.rpc("toggle_comment_love", { target_comment: comment.id });
  if (error) throw new Error("Couldn’t do that right now.");
  return Boolean(data);
}
