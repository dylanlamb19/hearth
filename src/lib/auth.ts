export type SessionUser = {
  id: string;
  name: string;
  email: string;
  handle: string;
};

export const DEMO_USER: SessionUser = {
  id: "u-ember",
  name: "Ember",
  email: "ember@hearth.demo",
  handle: "ember",
};

export const AUTH_COOKIE = "hearth_session";

export function encodeSession(user: SessionUser): string {
  if (typeof window === "undefined") return "";
  return btoa(JSON.stringify(user));
}

export function decodeSession(value: string | undefined | null): SessionUser | null {
  if (!value) return null;
  try {
    const raw = typeof atob === "function" ? atob(value) : Buffer.from(value, "base64").toString("utf8");
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.id || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}
