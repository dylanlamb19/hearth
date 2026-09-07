"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";
import { needsOnboarding } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");
    if (!email || password.length < 8) {
      setError("Use a valid email and a password with at least 8 characters.");
      return;
    }
    const user = login(email, password);
    if (needsOnboarding(user)) {
      router.push("/welcome");
    } else {
      router.push("/home");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-80"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/20 to-transparent" />
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
          <h1 className="font-display text-4xl text-ink-900">Welcome back</h1>
          <p className="mt-2 text-ink-600">Sign in to your quieter corner of the web.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-ink-600">Email</span>
              <input name="email" type="email" required placeholder="you@example.com" className="w-full rounded-2xl border-ink-200 bg-white px-4 py-3 text-ink-900 shadow-sm focus:border-ember-400 focus:ring-ember-300" />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-ink-600">Password</span>
              <input name="password" type="password" required minLength={8} placeholder="At least 8 characters" className="w-full rounded-2xl border-ink-200 bg-white px-4 py-3 text-ink-900 shadow-sm focus:border-ember-400 focus:ring-ember-300" />
            </label>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-ink-500 hover:text-ink-800">Forgot password?</Link>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
          <p className="mt-6 text-sm text-ink-500">
            New here? <Link href="/signup" className="font-medium text-ink-800 underline-offset-2 hover:underline">Create an account</Link>
          </p>
          <p className="mt-4 text-xs text-ink-400">Demo: ember@hearth.demo / hearth123</p>
        </div>
      </div>
    </div>
  );
}
