import type { SupabaseClient } from "@supabase/supabase-js";

const GLOBAL_STORAGE_KEY = "hearth_invite_code";

function storageKeyForUser(userId: string): string {
  return `${GLOBAL_STORAGE_KEY}:${userId}`;
}

/** Quiet Kindling rename: never mint new codes from the old email-derived handle. */
function inviteBaseFromSeed(seed: string): string {
  const base =
    (seed || "friend")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 12) || "friend";
  if (base === "kindlinghearthcrew") return "kindling";
  return base;
}

function isValidCode(code: string | null): code is string {
  return Boolean(code && /^[a-z0-9_-]{3,32}$/i.test(code));
}

function codeBase(code: string): string {
  const dash = code.indexOf("-");
  return (dash === -1 ? code : code.slice(0, dash)).toLowerCase();
}

/**
 * Build a short local invite code from handle/seed; persist per-user in localStorage.
 * Key: `hearth_invite_code:<userId>` (falls back to seed/handle when id missing).
 * Legacy global `hearth_invite_code` is left in place so already-shared /invite/[code] links stay valid.
 */
export function getOrCreateInviteCode(seed: string, userId?: string | null): string {
  const keyId = (userId || seed || "friend").trim() || "friend";
  const perUserKey = storageKeyForUser(keyId);
  const expectedBase = inviteBaseFromSeed(seed);

  if (typeof window !== "undefined") {
    try {
      const existing = localStorage.getItem(perUserKey);
      // Keep any already-shared code for this user (incl. pre-rename).
      if (isValidCode(existing)) return existing;

      // Migrate: if per-user empty and global exists AND global base matches this user's handle, adopt it.
      const global = localStorage.getItem(GLOBAL_STORAGE_KEY);
      if (isValidCode(global) && codeBase(global) === expectedBase) {
        localStorage.setItem(perUserKey, global);
        return global;
      }
    } catch {
      /* ignore */
    }
  }

  const base = expectedBase;
  const suffix =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(3)))
          .map((b) => (b % 36).toString(36))
          .join("")
      : Math.random().toString(36).slice(2, 5);
  const code = `${base}-${suffix}`;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(perUserKey, code);
      // Do not overwrite GLOBAL_STORAGE_KEY — leave legacy shared links alone.
    } catch {
      /* ignore */
    }
  }
  return code;
}

/** Personal invite URL for the current deploy (works on any host). */
export function buildInviteUrl(code: string): string {
  if (typeof window === "undefined") return `/invite/${code}`;
  return `${window.location.origin}/invite/${code}`;
}

// ---------------------------------------------------------------------------
// Server-side links (migration 0014). Demo mode (no Supabase) keeps the local code above.
// ---------------------------------------------------------------------------

export const INVITE_DAYS = 14;
export type MyInvite = { code: string; expiresAt: string | null };
export type ResolvedInvite =
  | { status: "ok"; displayName: string; inviterId: string | null }
  | { status: "expired" };

/** Only the shape of a real code is accepted before hitting the database. */
export function isServerCode(code: string): boolean {
  return /^[a-z0-9]{12}$/.test(code.toLowerCase());
}

type Row = { code: string; expires_at: string };

export async function fetchMyInvite(sb: SupabaseClient): Promise<MyInvite> {
  const { data, error } = await sb.rpc("my_invite_link");
  if (error) throw new Error("Couldn’t load your link. Try again?");
  const row = (data as Row[] | null)?.[0];
  if (!row) throw new Error("Couldn’t load your link. Try again?");
  return { code: row.code, expiresAt: row.expires_at };
}

export async function resetMyInvite(sb: SupabaseClient): Promise<MyInvite> {
  const { data, error } = await sb.rpc("reset_invite_link");
  if (error) {
    throw new Error(
      error.message.includes("invite_reset_rate_limited")
        ? "That’s a few resets today. Try again tomorrow."
        : "Couldn’t reset your link. Try again?",
    );
  }
  const row = (data as Row[] | null)?.[0];
  if (!row) throw new Error("Couldn’t reset your link. Try again?");
  return { code: row.code, expiresAt: row.expires_at };
}

/** Display name only. Unknown, reset, expired, deleted or blocked all come back as "expired". */
export async function resolveInvite(sb: SupabaseClient | null, code: string): Promise<ResolvedInvite> {
  if (!sb || !isServerCode(code)) return { status: "expired" };
  const { data, error } = await sb.rpc("resolve_invite", { invite_code: code.toLowerCase() });
  const row = (data as { status: string; display_name: string | null; inviter_id: string | null }[] | null)?.[0];
  if (error || !row || row.status !== "ok" || !row.display_name) return { status: "expired" };
  return { status: "ok", displayName: row.display_name, inviterId: row.inviter_id };
}

/** Amber-initial letter for the preview card and invite page (never a photo). */
export function initialOf(name: string): string {
  return (name.trim()[0] || "H").toUpperCase();
}
