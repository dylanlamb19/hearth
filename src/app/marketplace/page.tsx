"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MarketplaceCard } from "@/components/MarketplaceCard";
import { listings } from "@/data/seed";

export default function MarketplacePage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Marketplace</h1>
        <p className="mt-1 text-sm text-ink-500">Bikes, skillets, stools, cuttings. Local and priced in dollars.</p>
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-ink-100 bg-cream-100 px-4 py-3 text-sm text-ink-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ember-500" aria-hidden />
          <p>
            Local pickups only. Meet in public, trust your gut, never send money in chat. Hearth doesn’t hold funds.{" "}
            <Link
              href="/help#marketplace"
              className="font-medium text-ember-600 underline-offset-2 hover:underline"
            >
              Marketplace tip
            </Link>
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <MarketplaceCard key={listing.id} listing={listing} />
        ))}
      </div>
    </AppShell>
  );
}
