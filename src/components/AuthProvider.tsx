"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  AUTH_COOKIE,
  DEMO_USER,
  SessionUser,
  decodeSession,
  encodeSession,
  needsOnboarding as needsOnboardingFor,
  resolveKnownUser,
  withCanonicalIdentity,
} from "@/lib/auth";
import { handleFromName, normalizeHandle } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  fetchProfile,
  isHandleTakenInDb,
  profileToSessionUser,
  sessionPatchToRow,
} from "@/lib/supabase/profiles";

export type AuthMode = "supabase" | "demo";
export type AuthResult = {
  user: SessionUser | null;
  error?: string;
  needsEmailConfirm?: boolean;
  /** The server refused the signup because of the age check. */
  ageBlocked?: boolean;
};

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  /** "supabase" when env keys are set, otherwise the demo cookie fallback. */
  mode: AuthMode;
  /** True for the shared ember@hearth.demo login while real accounts are on (changes stay on this device). */
  isDemo: boolean;
  needsOnboarding: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, name: string, birthYear: number) => Promise<AuthResult>;
  logout: () => void;
  updateUser: (patch: Partial<SessionUser>) => void;
  completeOnboarding: (patch?: Partial<SessionUser>) => void;
  /** Resolves true if another account owns this handle. */
  isHandleTaken: (handle: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_PASSWORD = "hearth123";

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = name + "=" + encodeURIComponent(value) + "; path=/; max-age=2592000; SameSite=Lax";
}

function clearCookie(name: string) {
  document.cookie = name + "=; path=/; max-age=0; SameSite=Lax";
}

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Try again?";
  if (m.includes("already registered")) return "There's already an account with that email. Sign in instead?";
  if (m.includes("email not confirmed")) return "Check your inbox to confirm your email, then sign in.";
  return message;
}

/** Demo cookie login — used for everything when Supabase isn't configured. */
function demoCookieLogin(email: string, name?: string, handle?: string): SessionUser {
  const normalized = email.trim().toLowerCase();
  const known = resolveKnownUser(normalized);
  if (known) {
    writeCookie(AUTH_COOKIE, encodeSession(known));
    return known;
  }
  const displayName = name?.trim() || normalized.split("@")[0] || "Friend";
  const nextHandle =
    (handle && normalizeHandle(handle)) || handleFromName(name?.trim() ? name : displayName) || "friend";
  const next = withCanonicalIdentity({ id: "u-local", name: displayName, email: normalized, handle: nextHandle });
  writeCookie(AUTH_COOKIE, encodeSession(next));
  return next;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode: AuthMode = isSupabaseConfigured() ? "supabase" : "demo";
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const isDemo = mode === "supabase" && user?.email === DEMO_USER.email;

  useEffect(() => {
    let cancelled = false;
    const sb = getSupabaseBrowserClient();
    const cookieUser = decodeSession(readCookie(AUTH_COOKIE));

    if (!sb) {
      if (cookieUser) writeCookie(AUTH_COOKIE, encodeSession(cookieUser));
      setUser(cookieUser);
      setReady(true);
      return;
    }

    // Supabase mode: only the shared demo login may still ride the cookie.
    const demoCookie = cookieUser?.email === DEMO_USER.email ? cookieUser : null;
    if (cookieUser && !demoCookie) clearCookie(AUTH_COOKIE);

    async function hydrate(authUser: import("@supabase/supabase-js").User | null) {
      if (!authUser) {
        if (!cancelled) {
          setUser(demoCookie);
          setReady(true);
        }
        return;
      }
      const row = await fetchProfile(sb!, authUser.id);
      if (!cancelled) {
        setUser(profileToSessionUser(authUser, row));
        setReady(true);
      }
    }

    sb.auth.getUser().then(({ data }) => hydrate(data.user ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        if (!cancelled) setUser(null);
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        hydrate(session?.user ?? null);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const normalized = email.trim().toLowerCase();
      const sb = getSupabaseBrowserClient();
      if (!sb) {
        const next = demoCookieLogin(normalized);
        setUser(next);
        return { user: next };
      }
      if (normalized === DEMO_USER.email) {
        if (password !== DEMO_PASSWORD) return { user: null, error: "The demo password is hearth123." };
        writeCookie(AUTH_COOKIE, encodeSession(DEMO_USER));
        setUser(DEMO_USER);
        return { user: DEMO_USER };
      }
      const { data, error } = await sb.auth.signInWithPassword({ email: normalized, password });
      if (error || !data.user) return { user: null, error: friendlyError(error?.message ?? "Could not sign in.") };
      clearCookie(AUTH_COOKIE);
      const row = await fetchProfile(sb, data.user.id);
      const next = profileToSessionUser(data.user, row);
      setUser(next);
      return { user: next };
    },
    [],
  );

  const signup = useCallback(
    async (email: string, password: string, name: string, birthYear: number): Promise<AuthResult> => {
      const normalized = email.trim().toLowerCase();
      const sb = getSupabaseBrowserClient();
      if (!sb) {
        const next = { ...demoCookieLogin(normalized, name), birthYear };
        writeCookie(AUTH_COOKIE, encodeSession(next));
        setUser(next);
        return { user: next };
      }
      if (normalized === DEMO_USER.email) return { user: null, error: "That's the shared demo account — sign in instead." };
      const { data, error } = await sb.auth.signUp({
        email: normalized,
        password,
        options: {
          // birth_year is checked again by the signup trigger (0002_age_gate.sql).
          data: { name: name.trim(), birth_year: birthYear },
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/welcome" : undefined,
        },
      });
      if (error) {
        if (/hearth_age_blocked|database error saving new user/i.test(error.message)) {
          return { user: null, ageBlocked: true };
        }
        return { user: null, error: friendlyError(error.message) };
      }
      if (!data.session || !data.user) return { user: null, needsEmailConfirm: true };
      clearCookie(AUTH_COOKIE);
      const row = await fetchProfile(sb, data.user.id);
      const next = profileToSessionUser(data.user, row);
      setUser(next);
      return { user: next };
    },
    [],
  );

  const logout = useCallback(() => {
    clearCookie(AUTH_COOKIE);
    setUser(null);
    getSupabaseBrowserClient()?.auth.signOut();
  }, []);

  /** Optimistic local update; persists to profiles in Supabase mode (demo login stays local only). */
  const applyPatch = useCallback(
    (patch: Partial<SessionUser>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = withCanonicalIdentity({ ...prev, ...patch });
        const sb = getSupabaseBrowserClient();
        const cookieBacked = !sb || prev.email === DEMO_USER.email;
        if (cookieBacked) {
          writeCookie(AUTH_COOKIE, encodeSession(next));
        } else {
          const row = sessionPatchToRow(patch);
          if (Object.keys(row).length > 0) {
            sb.from("profiles")
              .upsert({ id: prev.id, ...row })
              .then(({ error }) => {
                if (error) console.warn("[hearth] profile save failed:", error.message);
              });
          }
        }
        return next;
      });
    },
    [],
  );

  const updateUser = useCallback((patch: Partial<SessionUser>) => applyPatch(patch), [applyPatch]);

  const completeOnboarding = useCallback(
    (patch?: Partial<SessionUser>) => {
      applyPatch({ ...patch, onboardingCompletedAt: new Date().toISOString() });
      try {
        localStorage.setItem("hearth_checklist", "1");
      } catch {
        /* ignore */
      }
    },
    [applyPatch],
  );

  const isHandleTaken = useCallback(
    async (handle: string) => {
      const sb = getSupabaseBrowserClient();
      if (!sb || !handle || isDemo) return false;
      return isHandleTakenInDb(sb, handle, user?.id);
    },
    [user?.id, isDemo],
  );

  const value = useMemo(
    () => ({
      user,
      ready,
      mode,
      isDemo,
      needsOnboarding: needsOnboardingFor(user),
      login,
      signup,
      logout,
      updateUser,
      completeOnboarding,
      isHandleTaken,
    }),
    [user, ready, mode, isDemo, login, signup, logout, updateUser, completeOnboarding, isHandleTaken],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
