"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { people, personById } from "@/data/seed";

/**
 * Friend requests ("knocks") and friendships. Supabase RPCs when configured; otherwise a
 * localStorage demo seeded with a couple of sample knocks and the sample roster as friends.
 */
const UUID = /^[0-9a-f-]{36}$/i;
const DEMO_KEY = "hearth_knocks_demo";
export const KNOCK_FAILED = "Couldn’t knock right now.";

export type PersonLite = { id: string; name: string; handle: string };
export type Knock = { id: string; person: PersonLite; createdAt: string };

type DemoState = { incoming: Knock[]; outgoing: Knock[]; friends: string[] };

function lite(id: string): PersonLite {
  const p = personById(id);
  return p ? { id: p.id, name: p.name, handle: p.handle } : { id, name: "Hearth member", handle: "" };
}

function demoState(selfId?: string): DemoState {
  const fallback: DemoState = {
    incoming: ["u-nova", "u-aria"].map((id, i) => ({
      id: `demo-knock-${id}`,
      person: lite(id),
      createdAt: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
    })),
    outgoing: [],
    friends: people.map((p) => p.id).filter((id) => id !== selfId && !["u-nova", "u-aria"].includes(id)),
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as DemoState) : fallback;
  } catch {
    return fallback;
  }
}

function saveDemo(s: DemoState) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

type ProfileRow = { id: string; name: string | null; handle: string | null };

function toLite(r: ProfileRow | null | undefined, id: string): PersonLite {
  return { id, name: r?.name || "Hearth member", handle: r?.handle || "" };
}

function friendlyError(message: string | undefined): Error {
  if (message?.includes("HEARTH_KNOCK_LIMIT")) return new Error("That’s a lot of knocking for one day. Try again tomorrow.");
  return new Error(KNOCK_FAILED);
}

export async function listIncoming(selfId: string): Promise<Knock[]> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return demoState(selfId).incoming;
  const { data, error } = await sb
    .from("friend_requests")
    .select("id, sender_id, created_at, sender:profiles!friend_requests_sender_fkey(id, name, handle)")
    .eq("recipient_id", selfId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as { id: string; sender_id: string; created_at: string; sender: ProfileRow | null }[]).map(
    (r) => ({ id: r.id, person: toLite(r.sender, r.sender_id), createdAt: r.created_at }),
  );
}

export async function listOutgoing(selfId: string): Promise<Knock[]> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return demoState(selfId).outgoing;
  const { data, error } = await sb
    .from("friend_requests")
    .select("id, recipient_id, created_at, recipient:profiles!friend_requests_recipient_fkey(id, name, handle)")
    .eq("sender_id", selfId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as { id: string; recipient_id: string; created_at: string; recipient: ProfileRow | null }[]).map(
    (r) => ({ id: r.id, person: toLite(r.recipient, r.recipient_id), createdAt: r.created_at }),
  );
}

export async function listFriends(selfId: string): Promise<PersonLite[]> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return demoState(selfId).friends.map(lite);
  const { data, error } = await sb.from("friendships").select("user_a, user_b");
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((r: { user_a: string; user_b: string }) => (r.user_a === selfId ? r.user_b : r.user_a));
  if (ids.length === 0) return [];
  const { data: profiles } = await sb.from("profiles").select("id, name, handle").in("id", ids);
  const byId = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));
  return ids.map((id) => toLite(byId.get(id), id));
}

export async function sendKnock(selfId: string, target: PersonLite): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb) {
    const s = demoState(selfId);
    if (s.friends.includes(target.id) || s.outgoing.some((k) => k.person.id === target.id)) return;
    s.outgoing = [{ id: `demo-out-${target.id}`, person: target, createdAt: new Date().toISOString() }, ...s.outgoing];
    saveDemo(s);
    return;
  }
  if (!UUID.test(target.id)) throw new Error(KNOCK_FAILED);
  const { error } = await sb.rpc("send_knock", { target: target.id });
  if (error) throw friendlyError(error.message);
}

/** "Let in" (accept) or "Not now" (decline, quiet: the sender isn't told). */
export async function respondKnock(selfId: string, knock: Knock, accept: boolean): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb) {
    const s = demoState(selfId);
    s.incoming = s.incoming.filter((k) => k.id !== knock.id);
    if (accept && !s.friends.includes(knock.person.id)) s.friends = [knock.person.id, ...s.friends];
    saveDemo(s);
    return;
  }
  const { error } = await sb.rpc("respond_knock", { knock_id: knock.id, accept });
  if (error) throw new Error("Couldn’t answer that knock. Try again?");
}

export async function cancelKnock(selfId: string, knock: Knock): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb) {
    const s = demoState(selfId);
    s.outgoing = s.outgoing.filter((k) => k.id !== knock.id);
    saveDemo(s);
    return;
  }
  const { error } = await sb.rpc("cancel_knock", { knock_id: knock.id });
  if (error) throw new Error("Couldn’t take that knock back. Try again?");
}

export async function unfriend(selfId: string, otherId: string): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb) {
    const s = demoState(selfId);
    s.friends = s.friends.filter((id) => id !== otherId);
    saveDemo(s);
    return;
  }
  const { error } = await sb.rpc("unfriend", { other: otherId });
  if (error) throw new Error("Couldn’t unfriend right now. Try again?");
}

/** Demo only: blocking also drops knocks and the friendship (the database trigger does this for real accounts). */
export function forgetInDemo(selfId: string, otherId: string) {
  if (getSupabaseBrowserClient()) return;
  const s = demoState(selfId);
  s.incoming = s.incoming.filter((k) => k.person.id !== otherId);
  s.outgoing = s.outgoing.filter((k) => k.person.id !== otherId);
  s.friends = s.friends.filter((id) => id !== otherId);
  saveDemo(s);
}
