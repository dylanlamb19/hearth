"use client";

import { Bookmark } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PostCard } from "@/components/PostCard";
import { MarketplaceCard } from "@/components/MarketplaceCard";
import { posts, listings, savedIds } from "@/data/seed";

export default function SavedPage() {
  const savedPosts = posts.filter((p) => savedIds.includes(p.id));
  const savedListings = listings.filter((l) => savedIds.includes(l.id));
  const isEmpty = savedPosts.length === 0 && savedListings.length === 0;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Saved</h1>
        <p className="mt-1 text-sm text-ink-500">Posts and market finds you want to keep nearby.</p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<Bookmark className="h-10 w-10" />}
          title="Nothing saved yet"
          description="Tap Save on any Moment to keep it here."
          actionLabel="Explore the feed"
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
