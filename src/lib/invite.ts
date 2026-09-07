const STORAGE_KEY = "hearth_invite_code";

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

/** Build a short local invite code from handle/id; persist in localStorage. */
export function getOrCreateInviteCode(seed: string): string {
  if (typeof window !== "undefined") {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      // Keep any already-shared code (incl. pre-rename) so /invite/[code] links stay valid.
      if (existing && /^[a-z0-9_-]{3,32}$/i.test(existing)) return existing;
    } catch {
      /* ignore */
    }
  }

  const base = inviteBaseFromSeed(seed);
  const suffix =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(3)))
          .map((b) => (b % 36).toString(36))
          .join("")
      : Math.random().toString(36).slice(2, 5);
  const code = `${base}-${suffix}`;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, code);
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
