"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";

export default function SignupPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "");
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");
    const terms = data.get("terms") === "on";
    if (!terms) {
      setError("Please agree to the Terms to continue.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    login(email, password, name);
    router.push("/home");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-80"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo light />
          <p className="max-w-md font-display text-3xl leading-snug text-cream-100">
            The living room of the internet, if living rooms still had manners.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-cream-100 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="font-display text-4xl text-ink-900">Join Hearth</h1>
          <p className="mt-2 text-ink-600">A quieter social network. No ads, no shouting.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button href="/signup" variant="secondary" className="w-full" type="button">Continue with Google</Button>
            <Button href="/signup" variant="secondary" className="w-full" type="button">Continue with X</Button>
          </div>
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-ink-400">
            <span className="h-px flex-1 bg-ink-200" /> or email <span className="h-px flex-1 bg-ink-200" />
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-ink-600">Your name</span>
              <input name="name" required placeholder="What friends call you" className="w-full rounded-2xl border-ink-200 bg-white px-4 py-3 shadow-sm focus:border-ember-400 focus:ring-ember-300" />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-ink-600">Email</span>
              <input name="email" type="email" required placeholder="you@example.com" className="w-full rounded-2xl border-ink-200 bg-white px-4 py-3 shadow-sm focus:border-ember-400 focus:ring-ember-300" />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-ink-600">Password</span>
              <input name="password" type="password" required minLength={8} placeholder="At least 8 characters" className="w-full rounded-2xl border-ink-200 bg-white px-4 py-3 shadow-sm focus:border-ember-400 focus:ring-ember-300" />
              <span className="mt-1.5 block text-xs text-ink-400">Use 8+ characters. A mix of letters and numbers is safer.</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-ink-600">
              <input name="terms" type="checkbox" className="mt-1 rounded border-ink-300 text-hearth focus:ring-ember-300" />
              <span>
                I agree to the <Link href="/terms" className="underline underline-offset-2">Terms</Link> and have read the <Link href="/privacy" className="underline underline-offset-2">Privacy</Link> notice.
              </span>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full">Create account</Button>
          </form>
          <p className="mt-6 text-sm text-ink-500">
            Already here? <Link href="/login" className="font-medium text-ink-800 underline-offset-2 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
