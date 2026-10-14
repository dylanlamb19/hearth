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

export type InviteLookup = { valid: boolean; inviterName: string | null };

/**
 * Check an invite code by shape: `<handle>-<suffix>` where handle is a known member.
 * Codes are minted on the inviter's device, so the person opening the link can't
 * look them up locally — we trust the handle prefix and name the inviter from it.
 * TODO(#22): replace with a real `invites` table lookup in Supabase.
 */
export function lookupInviteCode(
  rawCode: string,
  members: { id: string; name: string; handle: string }[],
): InviteLookup {
  const code = (rawCode || "").trim().toLowerCase();
  const match = /^([a-z0-9]{1,12})-([a-z0-9]{2,8})$/.exec(code);
  if (!match) return { valid: false, inviterName: null };
  const member = members.find((m) => inviteBaseFromSeed(m.handle) === match[1]);
  return member ? { valid: true, inviterName: member.name } : { valid: false, inviterName: null };
}

/** Read a pending invite code from the current URL (?invite=...). */
export function inviteFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get("invite");
  return isValidCode(value) ? value : null;
}

/** Invite code carried from /invite/[code] through signup (kept on this device). */
export const PENDING_INVITE_KEY = "hearth_pending_invite";
