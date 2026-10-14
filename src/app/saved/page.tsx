"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PostCard } from "@/components/PostCard";
import { MarketplaceCard } from "@/components/MarketplaceCard";
import { listings, savedIds, Post } from "@/data/seed";
import { getSavedPosts, SAVED_KEY } from "@/lib/saved";

export default function SavedPage() {
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const savedListings = listings.filter((l) => savedIds.includes(l.id));

  useEffect(() => {
    const refresh = () => setSavedPosts(getSavedPosts());
    refresh();
    // Keep the list in sync when Save is toggled here or in another tab.
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === SAVED_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("click", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("click", refresh);
    };
  }, []);

  const isEmpty = savedPosts.length === 0 && savedListings.length === 0;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Saved</h1>
        <p className="mt-1 text-sm text-ink-500">Moments and market finds you want to keep nearby.</p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<Bookmark className="h-10 w-10" />}
          title="Nothing saved yet — tap the bookmark on any Moment to keep it here."
          actionLabel="Back to Home"
          actionHref="/home"
        />
      ) : (
        <div className="space-y-6">
          {savedPosts.length > 0 ? (
            <div className="space-y-4">
              {savedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-cream-50 p-4 text-sm text-ink-500">
              No saved Moments yet — tap the bookmark on any Moment to keep it here.
            </p>
          )}
          {savedListings.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {savedListings.map((listing) => (
                <MarketplaceCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
