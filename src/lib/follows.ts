"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { people, type Person } from "@/data/seed";

/**
 * Follows data layer. Supabase `follows` when configured (real uuid accounts); otherwise a
 * localStorage demo list seeded from the session's followingIds.
 */
const UUID = /^[0-9a-f-]{36}$/i;
const DEMO_KEY = "hearth_following";
export const FOLLOW_LIMIT_ERROR = "HEARTH_FOLLOW_LIMIT";

export type FollowCounts = { followers: number; following: number };

function readDemo(fallback: string[] = []): string[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : fallback;
  } catch {
    return fallback;
  }
}

function writeDemo(ids: string[]) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    /* ignore */
  }
}

export async function listFollowingIds(userId: string, demoFallback: string[] = []): Promise<string[]> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return readDemo(demoFallback);
  const { data, error } = await sb.from("follows").select("followee_id").eq("follower_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { followee_id: string }) => r.followee_id);
}

export async function follow(targetId: string): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb || !UUID.test(targetId)) {
    if (!sb) writeDemo([...readDemo(), targetId]);
    return;
  }
  // follow_user() is the only way in (no direct INSERT on follows).
  const { error } = await sb.rpc("follow_user", { target: targetId });
  if (!error || error.code === "23505") return;
  if (error.message.includes(FOLLOW_LIMIT_ERROR)) {
    throw new Error("You’ve followed a lot of people today. Try again tomorrow.");
  }
  // Same message whether they blocked you, don't exist, or anything else went wrong, so a
  // follow attempt can't reveal a block.
  throw new Error("Couldn’t follow right now.");
}

export async function unfollow(targetId: string): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb || !UUID.test(targetId)) {
    if (!sb) writeDemo(readDemo().filter((id) => id !== targetId));
    return;
  }
  const { error } = await sb.from("follows").delete().eq("followee_id", targetId);
  if (error) throw new Error("Couldn’t unfollow right now. Try again?");
}

export async function followCounts(userId: string, demoFallback: string[] = []): Promise<FollowCounts> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return { followers: 0, following: readDemo(demoFallback).length };
  const [followers, following] = await Promise.all([
    sb.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", userId),
    sb.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

/** People to show on /people: real profiles when configured, otherwise the sample roster. */
export async function listPeople(): Promise<Person[]> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return people;
  const { data, error } = await sb.from("profiles").select("id, name, handle, bio").limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { id: string; name: string | null; handle: string | null; bio: string | null }) => ({
    id: r.id,
    name: r.name || "Hearth member",
    handle: r.handle || "",
    bio: r.bio || "",
    mutuals: 0,
  }));
}
