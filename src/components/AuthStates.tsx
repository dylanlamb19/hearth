"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { AUTH_COPY, resendConfirmation, type AuthErrorKind } from "@/lib/authErrors";

/** Busy label for auth buttons: 16px cream spinner on the left. */
export function AuthBusyLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-cream-100/40 border-t-cream-100" />
      {label}
    </span>
  );
}

/** "Send another" with a 60s cooldown and countdown. */
export function ResendLink({ email, className }: { email: string; className?: string }) {
  const [left, setLeft] = useState(60);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const waiting = left > 0 || sending;
  return (
    <button
      type="button"
      disabled={waiting}
      onClick={async () => {
        setSending(true);
        await resendConfirmation(email);
        setSending(false);
        setLeft(60);
      }}
      className={
        className ??
        "text-sm text-ink-600 underline-offset-2 hover:text-ink-900 hover:underline disabled:cursor-default disabled:text-ink-400 disabled:no-underline"
      }
    >
      {left > 0 ? `Send another (${left}s)` : "Send another"}
    </button>
  );
}

/** Inline error under the auth button: 14px ink with an ember-glow info icon. Never red. */
export function AuthError({ kind, email, fallback }: { kind?: AuthErrorKind; email?: string; fallback?: string }) {
  if (!kind && !fallback) return null;
  let body: React.ReactNode = kind ? AUTH_COPY[kind] : fallback;
  if (kind === "email-used") {
    body = (
      <>
        That email already has a home here.{" "}
        <Link href="/login" className="underline underline-offset-2 hover:text-ink-900">
          Sign in instead?
        </Link>
      </>
    );
  } else if (kind === "wrong-password") {
    body = (
      <>
        That email and password don&apos;t match. Try again, or{" "}
        <Link href="/forgot-password" className="underline underline-offset-2 hover:text-ink-900">
          reset your password
        </Link>
        .
      </>
    );
  } else if (kind === "unconfirmed") {
    body = (
      <>
        Check your inbox for a confirmation link. Didn&apos;t get it?{" "}
        {email ? (
          <ResendOnce email={email} />
        ) : (
          "Send another."
        )}
      </>
    );
  }
  return (
    <p role="alert" className="flex items-start gap-2 text-sm text-ink-700">
      <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ember-glow" />
      <span>{body}</span>
    </p>
  );
}

function ResendOnce({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  if (sent) return <ResendLink email={email} className="underline underline-offset-2 disabled:no-underline disabled:text-ink-400" />;
  return (
    <button
      type="button"
      onClick={async () => {
        setSent(true);
        await resendConfirmation(email);
      }}
      className="underline underline-offset-2 hover:text-ink-900"
    >
      Send another.
    </button>
  );
}
