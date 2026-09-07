"use client";

import { AppShell } from "@/components/AppShell";
import { MarketplaceCard } from "@/components/MarketplaceCard";
import { listings } from "@/data/seed";

export default function MarketplacePage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Marketplace</h1>
        <p className="mt-1 text-sm text-ink-500">Bikes, skillets, stools, cuttings. Local and priced in dollars.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <MarketplaceCard key={listing.id} listing={listing} />
        ))}
      </div>
    </AppShell>
  );
}
