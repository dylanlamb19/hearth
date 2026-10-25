import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Glow's auth copy (hearth-mocks/auth-states.md). Never show raw backend text. */
export type AuthErrorKind = "rate" | "email-used" | "wrong-password" | "weak-password" | "unconfirmed" | "unknown";

export const AUTH_COPY: Record<AuthErrorKind, string> = {
  rate: "Lots of people are settling in right now. Try again in a few minutes.",
  "email-used": "That email already has a home here. Sign in instead?",
  "wrong-password": "That email and password don't match. Try again, or reset your password.",
  "weak-password": "Use at least 8 characters.",
  unconfirmed: "Check your inbox for a confirmation link. Didn't get it? Send another.",
  unknown: "Something went wrong on our side. Try again in a moment.",
};

export function classifyAuthError(message = "", status?: number): AuthErrorKind {
  const m = message.toLowerCase();
  if (status === 429 || m.includes("rate limit") || m.includes("too many")) return "rate";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("already exists")) {
    return "email-used";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "wrong-password";
  if (m.includes("email not confirmed")) return "unconfirmed";
  if (m.includes("password") && (m.includes("least") || m.includes("weak") || m.includes("short"))) {
    return "weak-password";
  }
  return "unknown";
}

/** Re-send the signup confirmation email. Resolves false on any failure (incl. rate limits). */
export async function resendConfirmation(email: string): Promise<boolean> {
  const sb = getSupabaseBrowserClient();
  if (!sb || !email) return false;
  const { error } = await sb.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/auth/callback?next=/welcome" : undefined,
    },
  });
  return !error;
}
