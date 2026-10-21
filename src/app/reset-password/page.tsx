"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Reached from the reset email via /auth/callback, which has already signed the person in. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") || "");
    const confirm = String(data.get("confirm") || "");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don’t match.");
      return;
    }
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      setError("Password resets work once real accounts are on.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("That reset link has expired. Ask for a new one?");
      return;
    }
    router.replace("/home");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-card">
        <Logo />
        <h1 className="mt-8 font-display text-3xl text-ink-900">Choose a new password</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block text-ink-600">New password</span>
            <input
              id="reset-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-2xl border-ink-200 bg-cream-50 px-4 py-3 text-ink-900 shadow-sm focus:border-ember-400 focus:ring-ember-300"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-ink-600">Type it again</span>
            <input
              id="reset-confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-2xl border-ink-200 bg-cream-50 px-4 py-3 text-ink-900 shadow-sm focus:border-ember-400 focus:ring-ember-300"
            />
          </label>
          {error && <p className="text-sm text-ember-700">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            Save password
          </Button>
        </form>
        <p className="mt-6 text-sm text-ink-500">
          <Link href="/forgot-password" className="underline-offset-2 hover:underline">Send a new link</Link>
        </p>
      </div>
    </div>
  );
}
