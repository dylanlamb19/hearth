"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
import { Button } from "@/components/Button";

/** Minimal invite landing — warm welcome + signup/login CTA. No referral tracking. */
export default function InviteLandingPage() {
  const params = useParams<{ code: string }>();
  const code = (params?.code || "").trim();

  return (
    <div className="min-h-screen bg-cream-100">
      <PublicHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">You're invited</p>
        <h1 className="mt-3 font-display text-4xl text-ink-900 text-balance">Someone saved you a seat</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-600 text-balance">
          Hearth is a quieter place for people you already know. Come in when you're ready — no rush.
        </p>
        {code ? (
          <p className="mt-3 text-xs text-ink-400">
            Invite code <span className="font-mono text-ink-500">{code}</span>
          </p>
        ) : null}

        <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
          <Button href="/signup" variant="primary" className="w-full">
            Create your account
          </Button>
          <Button href="/login" variant="secondary" className="w-full">
            Sign in
          </Button>
        </div>

        <p className="mt-8 text-sm text-ink-400">
          Or{" "}
          <Link href="/about" className="underline underline-offset-2 hover:text-ink-600">
            learn what Hearth is
          </Link>
          .
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
