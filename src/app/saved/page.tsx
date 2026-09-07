"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { PostCard } from "@/components/PostCard";
import { MarketplaceCard } from "@/components/MarketplaceCard";
import { posts, listings, savedIds } from "@/data/seed";

export default function SavedPage() {
  const [empty, setEmpty] = useState(false);
  const savedPosts = posts.filter((p) => savedIds.includes(p.id));
  const savedListings = listings.filter((l) => savedIds.includes(l.id));

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-900">Saved</h1>
          <p className="mt-1 text-sm text-ink-500">Posts and market finds you want to keep nearby.</p>
        </div>
        <Button variant="outline" onClick={() => setEmpty((v) => !v)}>
          {empty ? "Show saved items" : "Preview empty state"}
        </Button>
      </div>

      {empty ? (
        <EmptyState
          icon={<Bookmark className="h-10 w-10" />}
          title="Nothing saved yet"
          description="Tap Save on a post or listing to keep it here for later — recipes, trail notes, porch finds."
          actionLabel="Browse the feed"
          actionHref="/home"
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {savedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {savedListings.map((listing) => (
              <MarketplaceCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
