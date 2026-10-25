"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Info } from "lucide-react";
import { birthYearOptions, isUnderMinAge, setAgeBlocked } from "@/lib/age";
import { AgeBlockedScreen, useAgeBlocked } from "@/components/AgeBlocked";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [blocked, setBlocked] = useAgeBlocked();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState("");

  /** Inline error under the button; form values stay put and focus returns to the button. */
  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => document.getElementById("signup-submit")?.focus());
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "");
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");
    const terms = data.get("terms") === "on";
    const birthYear = Number(data.get("birthYear") || 0);
    if (!birthYear) {
      showError("Please choose your birth year.");
      return;
    }
    if (isUnderMinAge(birthYear)) {
      setAgeBlocked();
      setBlocked(true);
      return;
    }
    if (!terms) {
      showError("Please agree to the Terms to continue.");
      return;
    }
    if (password.length < 8) {
      showError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setBusy(true);
    let result: Awaited<ReturnType<typeof signup>>;
    try {
      result = await signup(email, password, name, birthYear);
    } catch {
      result = { user: null, error: "We couldn’t reach Hearth just now. Check your connection and try again." };
    }
    setBusy(false);
    if (result.ageBlocked) {
      setAgeBlocked();
      setBlocked(true);
      return;
    }
    if (result.needsEmailConfirm) {
      setCheckEmail(email);
      return;
    }
    if (!result.user) {
      showError(result.error || "Something went wrong on our side. Try again in a moment.");
      return;
    }
    router.push("/welcome");
  }

  if (blocked) return <AgeBlockedScreen />;

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
            <Button
              type="button"
              variant="secondary"
              className="w-full cursor-not-allowed opacity-60"
              disabled
              aria-disabled="true"
              title="Coming soon"
            >
              Google · Coming soon
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full cursor-not-allowed opacity-60"
              disabled
              aria-disabled="true"
              title="Coming soon"
            >
              X · Coming soon
            </Button>
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
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border-ink-200 bg-white px-4 py-3 pr-16 shadow-sm focus:border-ember-400 focus:ring-ember-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-ink-500 hover:text-ink-800"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <span className="mt-1.5 block text-xs text-ink-400">
                At least 8 characters. Longer is stronger — mix letters, numbers, and a symbol if you can.
              </span>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-ink-600">Birth year</span>
              <select
                name="birthYear"
                required
                defaultValue=""
                className="w-full rounded-2xl border-ink-200 bg-white px-4 py-3 shadow-sm focus:border-ember-400 focus:ring-ember-300"
              >
                <option value="" disabled>
                  Choose a year
                </option>
                {birthYearOptions().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="mt-1.5 block text-xs text-ink-400">We keep only the year.</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-ink-600">
              <input name="terms" type="checkbox" className="mt-1 rounded border-ink-300 text-hearth focus:ring-ember-300" />
              <span>
                I agree to the <Link href="/terms" className="underline underline-offset-2">Terms</Link>, and I’ve read the <Link href="/privacy" className="underline underline-offset-2">Privacy</Link> notice and <Link href="/dmca" className="underline underline-offset-2">DMCA</Link> policy.
              </span>
            </label>
            {checkEmail && (
              <p className="rounded-2xl bg-cream-200 px-4 py-3 text-sm text-ink-700">
                Almost in — we sent a confirmation link to {checkEmail}. Open it to finish setting up.
              </p>
            )}
            <Button
              id="signup-submit"
              type="submit"
              className={cn("w-full", busy && "disabled:opacity-80")}
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    aria-hidden
                    className="h-4 w-4 animate-spin rounded-full border-2 border-cream-100/40 border-t-cream-100"
                  />
                  Settling you in…
                </span>
              ) : (
                "Create account"
              )}
            </Button>
            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-ink-700">
                <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ember-glow" />
                <span>{error}</span>
              </p>
            )}
          </form>
          <p className="mt-4 text-center text-xs text-ink-500">
            Free · No spam · You can delete anytime
          </p>
          <p className="mt-1.5 text-center text-xs text-ink-400">
            <Link href="/terms" className="underline underline-offset-2 hover:text-ink-700">Terms</Link>
            {" · "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-ink-700">Privacy</Link>
            {" · "}
            <Link href="/dmca" className="underline underline-offset-2 hover:text-ink-700">DMCA</Link>
          </p>
          <p className="mt-6 text-sm text-ink-500">
            Already here? <Link href="/login" className="font-medium text-ink-800 underline-offset-2 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
