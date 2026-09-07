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
    return parsed;
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
