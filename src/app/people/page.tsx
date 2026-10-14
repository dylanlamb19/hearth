"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/components/AuthProvider";
import { people } from "@/data/seed";
import { getBlockedIds } from "@/lib/blocked";
import { INTERESTS } from "@/lib/interests";
import { cn } from "@/lib/utils";
import { isFollowing, isFriend, toggleFollowingIds } from "@/lib/social";


function PeoplePageContent() {
  const { user, updateUser } = useAuth();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [interest, setInterest] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
  }, [searchParams]);

  // Your interests first, then the rest of the welcome list.
  const chips = useMemo(() => {
    const saved = (user?.interests ?? []).filter((c) => (INTERESTS as readonly string[]).includes(c));
    return [...saved, ...INTERESTS.filter((c) => !saved.includes(c))];
  }, [user?.interests]);

  // Re-read block list each render so unblock in Settings is reflected on return.
  const blockedIds = new Set(getBlockedIds());

  const results = useMemo(() => {
    // "@jordan" searches the handle "jordan".
    const q = query.trim().toLowerCase().replace(/^@+/, "");
    return people
      .filter((p) => p.id !== user?.id)
      // Without a search, only suggest people you aren't connected to yet.
      .filter((p) => Boolean(q) || Boolean(interest) || (!isFriend(user, p.id) && !isFollowing(user, p.id)))
      .filter((p) => !blockedIds.has(p.id))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.handle.toLowerCase().includes(q) ||
          p.bio.toLowerCase().includes(q)
        );
      })
      .filter((p) => {
        if (!interest) return true;
        return (p.interests ?? []).includes(interest);
      });
    // blockedIds rebuilt each render; serialize for stable memo deps
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional re-read via blockedKey
  }, [query, interest, user, [...blockedIds].sort().join(",")]);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">People on Hearth</h1>
        <p className="mt-1 text-sm text-ink-500">Find people in the community — say hi when it feels right.</p>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people on Hearth"
          className="w-full rounded-full border-0 bg-white py-3 pl-10 pr-4 text-sm shadow-soft ring-1 ring-ink-100 placeholder:text-ink-400 focus:ring-2 focus:ring-ember-300"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = interest === chip;
          return (
            <button
              key={chip}
              type="button"
              aria-pressed={active}
              onClick={() => setInterest(active ? null : chip)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm capitalize transition",
                active
                  ? "bg-cream-200 text-ink-900 ring-1 ring-ember-200"
                  : "bg-white text-ink-600 ring-1 ring-ink-100 hover:bg-cream-50",
              )}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<UserRound className="h-10 w-10" />}
          title="No one matched"
          description="Try another name or interest."
          {...(interest || query
            ? {
                secondaryLabel: "Clear filter",
                onSecondaryClick: () => {
                  setInterest(null);
                  setQuery("");
                },
              }
            : {})}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-ink-400">People on Hearth</p>
          {results.map((p) => {
            const friend = isFriend(user, p.id);
            const followingThem = isFollowing(user, p.id);
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-3xl border border-ink-100 bg-white p-4 shadow-card"
              >
                <Avatar name={p.name} online={p.online} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900">{p.name}</p>
                  <p className="truncate text-xs text-ink-400">@{p.handle}</p>
                </div>
                {friend ? (
                  <span className="rounded-full bg-cream-100 px-3 py-1.5 text-xs text-ink-600 ring-1 ring-ink-100">Friends</span>
                ) : (
                  <Button
                    variant={followingThem ? "secondary" : "primary"}
                    className="!px-4 !py-2 text-xs"
                    aria-pressed={followingThem}
                    onClick={() => updateUser({ followingIds: toggleFollowingIds(user, p.id) })}
                  >
                    {followingThem ? "Following" : "Follow"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

export default function PeoplePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-cream-100 text-ink-500">
          Warming the room…
        </div>
      }
    >
      <PeoplePageContent />
    </Suspense>
  );
}
