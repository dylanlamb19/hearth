"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { addBlockedId, getBlockedIds, removeBlockedId } from "@/lib/blocked";

/**
 * Blocks data layer. Real accounts (uuid ids) go to the `blocks` table when Supabase is
 * configured; demo and sample people stay in localStorage (`hearth_blocked`).
 * Blocked people's profiles are hidden from the blocker too (blocks are symmetric), so we
 * keep the display name locally for the Settings list.
 */
const UUID = /^[0-9a-f-]{36}$/i;
const NAMES_KEY = "hearth_blocked_names";
const MIGRATED_PREFIX = "hearth_blocks_migrated:";

function readNames(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NAMES_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function blockedName(id: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return readNames()[id];
}

function rememberName(id: string, name?: string) {
  if (!name) return;
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify({ ...readNames(), [id]: name }));
  } catch {
    /* ignore */
  }
}

export async function listBlockedIds(): Promise<string[]> {
  const local = getBlockedIds();
  const sb = getSupabaseBrowserClient();
  if (!sb) return local;
  const { data, error } = await sb.from("blocks").select("blocked_id");
  if (error) {
    console.warn("[hearth] couldn't load blocks:", error.message);
    return local;
  }
  const remote = (data ?? []).map((r: { blocked_id: string }) => r.blocked_id);
  return Array.from(new Set([...remote, ...local.filter((id) => !UUID.test(id))]));
}

export async function blockPerson(id: string, name?: string): Promise<void> {
  rememberName(id, name);
  const sb = getSupabaseBrowserClient();
  if (sb && UUID.test(id)) {
    const { error } = await sb.from("blocks").insert({ blocked_id: id });
    if (error && error.code !== "23505") throw new Error("Couldn’t block right now. Try again?");
    return;
  }
  addBlockedId(id);
}

export async function unblockPerson(id: string): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (sb && UUID.test(id)) {
    const { error } = await sb.from("blocks").delete().eq("blocked_id", id);
    if (error) throw new Error("Couldn’t unblock right now. Try again?");
    return;
  }
  removeBlockedId(id);
}

/**
 * One time per account: copy device-only blocks of real accounts into the table. Each id is
 * tried on its own; stale or missing ids (deleted accounts, bad data) are skipped. The
 * device copies are cleared and the migration is marked done either way, so it never loops.
 */
export async function migrateLocalBlocks(userId: string): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb || typeof window === "undefined") return;
  const flag = MIGRATED_PREFIX + userId;
  if (localStorage.getItem(flag)) return;
  const ids = getBlockedIds().filter((id) => UUID.test(id) && id !== userId);
  for (const id of ids) {
    const { error } = await sb.from("blocks").insert({ blocked_id: id });
    if (error && error.code !== "23505") console.warn("[hearth] skipped a stale device block:", error.code);
    removeBlockedId(id);
  }
  localStorage.setItem(flag, new Date().toISOString());
}
