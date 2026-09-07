export type SessionUser = {
  id: string;
  name: string;
  email: string;
  handle: string;
  bio?: string;
  photoUrl?: string;
  interests?: string[];
  followingIds?: string[];
  onboardingCompletedAt?: string;
};

export const DEMO_USER: SessionUser = {
  id: "u-ember",
  name: "Ember",
  email: "ember@hearth.demo",
  handle: "ember",
  bio: "Keeping the lights low and the kettle on.",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

/** Crew growth account — quiet rename from email-local-part kindling.hearth.crew / @kindlinghearthcrew. */
export const KINDLING_USER: SessionUser = {
  id: "u-kindling",
  name: "Kindling",
  email: "kindling.hearth.crew@gmail.com",
  handle: "kindling",
  bio: "Soft invites. One seat at a time.",
  onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
};

/** Pre-rename handle / display leftovers from email local-part signup. */
export const KINDLING_HANDLE_ALIASES = ["kindlinghearthcrew", "kindling.hearth.crew"] as const;

const KNOWN_USERS_BY_EMAIL: Record<string, SessionUser> = {
  [DEMO_USER.email]: DEMO_USER,
  [KINDLING_USER.email]: KINDLING_USER,
};

export function resolveKnownUser(email: string): SessionUser | null {
  const key = email.trim().toLowerCase();
  return KNOWN_USERS_BY_EMAIL[key] ?? null;
}

function normalizeLooseHandle(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Map stale Kindling cookie/session (email-derived name/handle) to Kindling / @kindling. */
export function withCanonicalIdentity(user: SessionUser): SessionUser {
  const known = resolveKnownUser(user.email);
  if (known) {
    return {
      ...known,
      interests: user.interests ?? known.interests,
      followingIds: user.followingIds ?? known.followingIds,
      photoUrl: user.photoUrl ?? known.photoUrl,
      onboardingCompletedAt: user.onboardingCompletedAt ?? known.onboardingCompletedAt,
      bio:
        user.bio && user.bio.trim() && user.bio.trim().toLowerCase() !== "kindling.hearth.crew"
          ? user.bio
          : known.bio,
    };
  }

  const handleKey = normalizeLooseHandle(user.handle || "");
  const nameKey = (user.name || "").trim().toLowerCase();
  const isLegacyKindling =
    KINDLING_HANDLE_ALIASES.some((a) => normalizeLooseHandle(a) === handleKey) ||
    nameKey === "kindling.hearth.crew";

  if (isLegacyKindling) {
    return {
      ...KINDLING_USER,
      interests: user.interests ?? KINDLING_USER.interests,
      followingIds: user.followingIds ?? KINDLING_USER.followingIds,
      photoUrl: user.photoUrl ?? KINDLING_USER.photoUrl,
      onboardingCompletedAt: user.onboardingCompletedAt ?? KINDLING_USER.onboardingCompletedAt,
    };
  }

  return user;
}

export const AUTH_COOKIE = "hearth_session";

export function encodeSession(user: SessionUser): string {
  if (typeof window === "undefined") return "";
  return btoa(unescape(encodeURIComponent(JSON.stringify(user))));
}

export function decodeSession(value: string | undefined | null): SessionUser | null {
  if (!value) return null;
  try {
    const raw =
      typeof atob === "function"
        ? decodeURIComponent(escape(atob(value)))
        : Buffer.from(value, "base64").toString("utf8");
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.id || !parsed?.email) return null;
    return withCanonicalIdentity(parsed);
  } catch {
    return null;
  }
}

export function needsOnboarding(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  if (user.onboardingCompletedAt) return false;
  if (user.photoUrl || (user.bio && user.bio.trim().length > 0)) return false;
  return true;
}
