"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/components/AuthProvider";
import { people as samplePeople, type Person } from "@/data/seed";
import { listBlockedIds } from "@/lib/blocks";
import { follow, listFollowingIds, listPeople, unfollow } from "@/lib/follows";
import { ReportMenu } from "@/components/ReportMenu";
import { cancelKnock, listFriends, listOutgoing, sendKnock, type Knock } from "@/lib/knocks";
import { cn } from "@/lib/utils";

const DEFAULT_INTERESTS = ["trails", "cooking", "design", "music", "markets", "plants"] as const;

function PeoplePageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [interest, setInterest] = useState<string | null>(null);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [people, setPeople] = useState<Person[]>(samplePeople);
  const [blockedList, setBlockedList] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Knock (amber outline) -> Knocked (quiet, tap to take back) -> Friends pill.
  // A value of null means "knocked, waiting for the server's knock id".
  const [knocked, setKnocked] = useState<Record<string, Knock | null>>({});
  const [friendIds, setFriendIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([listOutgoing(user.id), listFriends(user.id)])
      .then(([out, fr]) => {
        if (cancelled) return;
        setKnocked(Object.fromEntries(out.map((k) => [k.person.id, k])));
        setFriendIds(Object.fromEntries(fr.map((p) => [p.id, true])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function knock(p: Person) {
    if (!user || p.id in knocked) return;
    setKnocked((prev) => ({ ...prev, [p.id]: null }));
    setError(null);
    try {
      await sendKnock(user.id, { id: p.id, name: p.name, handle: p.handle });
      // A mutual knock makes you friends straight away; otherwise pick up the knock id.
      const [out, fr] = await Promise.all([listOutgoing(user.id), listFriends(user.id)]);
      setFriendIds(Object.fromEntries(fr.map((f) => [f.id, true])));
      const mine = out.find((k) => k.person.id === p.id);
      setKnocked((prev) => ({ ...prev, [p.id]: mine ?? null }));
    } catch (e) {
      setKnocked((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      setError((e as Error).message);
    }
  }

  async function takeBack(p: Person) {
    const k = knocked[p.id];
    if (!user || !k) return;
    setKnocked((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
    try {
      await cancelKnock(user.id, k);
    } catch (e) {
      setKnocked((prev) => ({ ...prev, [p.id]: k }));
      setError((e as Error).message);
    }
  }

  function onBlockedPerson(id: string) {
    setBlockedList((list) => (list.includes(id) ? list : [...list, id]));
  }


  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([listPeople(), listFollowingIds(user.id, user.followingIds ?? []), listBlockedIds()])
      .then(([roster, followingIds, blocked]) => {
        if (cancelled) return;
        setPeople(roster);
        setFollowing(Object.fromEntries(followingIds.map((id) => [id, true])));
        setBlockedList(blocked);
      })
      .catch(() => !cancelled && setError("Couldn’t load people right now."));
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function toggleFollow(id: string) {
    const was = !!following[id];
    setFollowing((prev) => ({ ...prev, [id]: !was }));
    setError(null);
    try {
      await (was ? unfollow(id) : follow(id));
    } catch (e) {
      // Roll back only this person.
      setFollowing((prev) => ({ ...prev, [id]: was }));
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
  }, [searchParams]);

  const chips = useMemo(() => {
    const saved = user?.interests?.filter((c) => c.trim().length > 0) ?? [];
    if (saved.length > 0) return saved;
    return [...DEFAULT_INTERESTS];
  }, [user?.interests]);

  const blockedIds = useMemo(() => new Set(blockedList), [blockedList]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => p.id !== user?.id)
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
        return p.bio.toLowerCase().includes(interest.toLowerCase());
      });
  }, [people, query, interest, user?.id, blockedIds]);

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

      {error && <p className="mb-4 text-sm text-ember-700">{error}</p>}

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
                  {p.handle && <p className="truncate text-xs text-ink-400">@{p.handle}</p>}
                </div>
                <Button
                  variant={isFollowing ? "secondary" : "primary"}
                  className="!px-4 !py-2 text-xs"
                  onClick={() => void toggleFollow(p.id)}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                {friendIds[p.id] ? (
                  <span className="rounded-full bg-cream-100 px-3 py-1.5 text-xs font-medium text-ink-600">Friends</span>
                ) : p.id in knocked ? (
                  <button
                    type="button"
                    onClick={() => void takeBack(p)}
                    disabled={!knocked[p.id]}
                    title="Tap to take back"
                    aria-label={`Knocked on ${p.name}’s door. Tap to take back.`}
                    className="rounded-full px-3 py-1.5 text-xs text-ink-500 hover:bg-cream-100 hover:text-ink-800"
                  >
                    Knocked
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void knock(p)}
                    aria-label={`Knock on ${p.name}’s door`}
                    className="rounded-full border border-ember-glow px-4 py-2 text-xs font-medium text-ember-glow transition hover:bg-ember-100"
                  >
                    Knock
                  </button>
                )}
                <ReportMenu subject={p.name} subjectId={p.id} reportPerson onBlocked={onBlockedPerson} />
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
