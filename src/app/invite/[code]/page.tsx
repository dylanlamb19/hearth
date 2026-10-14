"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
import { Button } from "@/components/Button";
import { people } from "@/data/seed";
import { lookupInviteCode, type InviteLookup } from "@/lib/invite";

/** Invite landing — checks the code, names the inviter when known. No referral tracking. */
export default function InviteLandingPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code || "").trim();
  const [lookup, setLookup] = useState<InviteLookup | null>(null);

  useEffect(() => {
    setLookup(lookupInviteCode(code, people));
  }, [code]);

  const q = `?invite=${encodeURIComponent(code)}`;

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-16 text-center sm:py-24">
        {lookup === null ? (
          <div className="h-40 w-full animate-pulse rounded-3xl bg-cream-200/60" aria-hidden />
        ) : lookup.valid ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">You’re invited</p>
            <h1 className="mt-3 font-display text-4xl text-ink-900 text-balance">
              {lookup.inviterName ? `${lookup.inviterName} saved you a seat by the hearth.` : "Someone saved you a seat by the hearth."}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-600 text-balance">
              Hearth is a quieter place for people you already know. Come in when you’re ready — no rush.
            </p>
            <p className="mt-3 text-xs text-ink-400">
              Invite code <span className="font-mono text-ink-500">{code}</span>
            </p>
            <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
              <Button href={`/signup${q}`} variant="primary" className="w-full">
                Create account
              </Button>
              <Button href={`/login${q}`} variant="secondary" className="w-full">
                Sign in
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl text-ink-900 text-balance">This invite link has cooled off.</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-600 text-balance">
              Ask whoever sent it for a fresh one, or come in anyway.
            </p>
            <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
              <Button href="/signup" variant="primary" className="w-full">
                Create account
              </Button>
            </div>
          </>
        )}

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
