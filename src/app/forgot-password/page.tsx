"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Stubbed reset-token flow: always show the same confirmation (no account enumeration).
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-card">
        <Logo />
        <h1 className="mt-8 font-display text-3xl text-ink-900">Reset your password</h1>
        <p className="mt-2 text-sm text-ink-600">
          Enter the email on your Hearth account and we&apos;ll send a reset link if it&apos;s here.
        </p>
        {sent ? (
          <div className="mt-6 rounded-2xl bg-cream-100 p-4 text-sm text-ink-700">
            If that email&apos;s on Hearth, we sent a reset link.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-ink-600">Email</span>
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-2xl border-ink-200 bg-cream-50 px-4 py-3 text-ink-900 shadow-sm focus:border-ember-400 focus:ring-ember-300"
              />
            </label>
            <Button type="submit" className="w-full">Send reset link</Button>
          </form>
        )}
        <p className="mt-6 text-sm text-ink-500">
          <Link href="/login" className="underline-offset-2 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
