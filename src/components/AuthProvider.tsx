"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  AUTH_COOKIE,
  DEMO_USER,
  SessionUser,
  decodeSession,
  encodeSession,
  needsOnboarding as needsOnboardingFor,
  withCanonicalIdentity,
} from "@/lib/auth";
import { AGE_BLOCK_ERROR } from "@/lib/age";
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
  /** True when Supabase isn't configured and the shared demo session is in use. */
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
/**
 * Demo mode only (no Supabase keys). Optional: set NEXT_PUBLIC_DEMO_PASSWORD to require it;
 * otherwise any password works for the one demo email. No password lives in source.
 */
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";
const DEMO_ONLY_MESSAGE = "Real accounts aren’t open yet. Try the demo: ember@hearth.demo.";

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

/** Demo cookie session — only when Supabase isn't configured, and only for ember@hearth.demo. */
function demoCookieLogin(): SessionUser {
  writeCookie(AUTH_COOKIE, encodeSession(DEMO_USER));
  return DEMO_USER;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode: AuthMode = isSupabaseConfigured() ? "supabase" : "demo";
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const isDemo = mode === "demo" && user !== null;

  useEffect(() => {
    let cancelled = false;
    const sb = getSupabaseBrowserClient();
    const cookieUser = decodeSession(readCookie(AUTH_COOKIE));

    if (!sb) {
      // Demo mode: only the shared demo account may hold a cookie session.
      const demoCookie = cookieUser?.email === DEMO_USER.email ? cookieUser : null;
      if (cookieUser && !demoCookie) clearCookie(AUTH_COOKIE);
      setUser(demoCookie);
      setReady(true);
      return;
    }

    // Supabase mode: no demo cookie at all.
    if (cookieUser) clearCookie(AUTH_COOKIE);

    async function hydrate(authUser: import("@supabase/supabase-js").User | null) {
      if (!authUser) {
        if (!cancelled) {
          setUser(null);
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
        if (normalized !== DEMO_USER.email) return { user: null, error: DEMO_ONLY_MESSAGE };
        if (DEMO_PASSWORD && password !== DEMO_PASSWORD) {
          return { user: null, error: "That email and password don't match. Try again?" };
        }
        const next = demoCookieLogin();
        setUser(next);
        return { user: next };
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
      if (!sb) return { user: null, error: DEMO_ONLY_MESSAGE };
      const { data, error } = await sb.auth.signUp({
        email: normalized,
        password,
        options: {
          // birth_year is checked again by the signup trigger (0002_age_gate.sql);
          // terms_accepted sets profiles.terms_accepted_at.
          data: { name: name.trim(), birth_year: birthYear, terms_accepted: true },
          emailRedirectTo:
            typeof window !== "undefined" ? window.location.origin + "/auth/callback?next=/welcome" : undefined,
        },
      });
      if (error) {
        // Only the trigger's own code counts. GoTrue usually hides trigger messages behind a
        // generic "Database error saving new user", which we show as a normal error, never the block screen.
        if (error.message.includes(AGE_BLOCK_ERROR)) {
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
        if (!sb) {
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
      if (!sb || !handle) return false;
      // Throws if the check fails; callers must not treat that as "free".
      return isHandleTakenInDb(sb, handle, user?.id);
    },
    [user?.id],
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
