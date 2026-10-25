"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
import { Button } from "@/components/Button";
import { AgeBlockedScreen, useAgeBlocked } from "@/components/AgeBlocked";
import { rememberInvite } from "@/lib/settleIn";

type Props = { code: string; displayName: string | null };

/**
 * Glow invite-share-card v2. Shows only the inviter's display name and an amber initial:
 * no photo, handle, Moments or friends. Following the link never makes anyone friends;
 * the code is remembered so Settle in step 2 can offer a "Let in" tap.
 */
export function InviteLanding({ code, displayName }: Props) {
  const [blocked] = useAgeBlocked();
  useEffect(() => {
    if (displayName) rememberInvite(code);
  }, [code, displayName]);

  if (blocked) return <AgeBlockedScreen />;
  const signupHref = displayName ? `/signup?invite=${encodeURIComponent(code)}` : "/signup";

  return (
    <div className="min-h-screen bg-cream-100">
      <PublicHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:py-24">
        <div
          className="relative h-40 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-cream-50 to-ember-100 bg-cover bg-right"
          style={{ backgroundImage: "url(/landing/hearth-living-room.webp)" }}
          aria-hidden
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cream-100 via-cream-100/70 to-transparent" />
        </div>
        {displayName ? (
          <>
            <div
              className="-mt-12 flex h-24 w-24 items-center justify-center rounded-full bg-ember-500 font-display text-4xl text-cream-50 ring-4 ring-cream-100"
              aria-hidden
            >
              {(displayName.trim()[0] || "H").toUpperCase()}
            </div>
            <h1 className="mt-5 font-display text-4xl text-ink-900 text-balance">{displayName} saved you a seat.</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-600 text-balance">
              {displayName} will be waiting for you inside.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-8 font-display text-4xl text-ink-900 text-balance">This invite has cooled off.</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-600 text-balance">You can still come in.</p>
          </>
        )}

        <div className="mt-8 flex w-full max-w-xs flex-col items-center gap-3">
          <Button href={signupHref} variant="primary" className="w-full">
            Come on in
          </Button>
          <Link href="/login" className="text-sm text-ink-500 underline-offset-2 hover:text-ink-700 hover:underline">
            I already have an account
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
