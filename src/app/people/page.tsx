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
import { cn } from "@/lib/utils";

const DEFAULT_INTERESTS = ["trails", "cooking", "design", "music", "markets", "plants"] as const;

function PeoplePageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [interest, setInterest] = useState<string | null>(null);
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
  }, [searchParams]);

  const chips = useMemo(() => {
    const saved = user?.interests?.filter((c) => c.trim().length > 0) ?? [];
    if (saved.length > 0) return saved;
    return [...DEFAULT_INTERESTS];
  }, [user?.interests]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => p.id !== user?.id)
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
        return p.bio.toLowerCase().includes(interest.toLowerCase());
      });
  }, [query, interest, user?.id]);

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
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-ink-400">People on Hearth</p>
          {results.map((p) => {
            const isFollowing = !!following[p.id];
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
                <Button
                  variant={isFollowing ? "secondary" : "primary"}
                  className="!px-4 !py-2 text-xs"
                  onClick={() =>
                    setFollowing((prev) => ({
                      ...prev,
                      [p.id]: !prev[p.id],
                    }))
                  }
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
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
