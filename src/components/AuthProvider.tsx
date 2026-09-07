"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { AUTH_COOKIE, DEMO_USER, SessionUser, decodeSession, encodeSession } from "@/lib/auth";

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  login: (email: string, password: string, name?: string) => SessionUser;
  logout: () => void;
  updateUser: (patch: Partial<SessionUser>) => void;
  completeOnboarding: (patch?: Partial<SessionUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(decodeSession(readCookie(AUTH_COOKIE)));
    setReady(true);
  }, []);

  const login = useCallback((email: string, _password: string, name?: string) => {
    const normalized = email.trim().toLowerCase();
    const next: SessionUser =
      normalized === DEMO_USER.email
        ? DEMO_USER
        : {
            id: "u-local",
            name: name?.trim() || normalized.split("@")[0] || "Friend",
            email: normalized,
            handle: (name?.trim() || normalized.split("@")[0] || "friend").toLowerCase().replace(/\s+/g, ""),
          };
    writeCookie(AUTH_COOKIE, encodeSession(next));
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    clearCookie(AUTH_COOKIE);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<SessionUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      writeCookie(AUTH_COOKIE, encodeSession(next));
      return next;
    });
  }, []);

  const completeOnboarding = useCallback((patch?: Partial<SessionUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next: SessionUser = {
        ...prev,
        ...patch,
        onboardingCompletedAt: new Date().toISOString(),
      };
      writeCookie(AUTH_COOKIE, encodeSession(next));
      try {
        localStorage.setItem("hearth_checklist", "1");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout, updateUser, completeOnboarding }),
    [user, ready, login, logout, updateUser, completeOnboarding],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
