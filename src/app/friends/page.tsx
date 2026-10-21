"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DoorOpen, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { InviteSheet } from "@/components/InviteSheet";
import { ReportMenu } from "@/components/ReportMenu";
import { useAuth } from "@/components/AuthProvider";
import { timeAgo } from "@/lib/format";
import {
  cancelKnock,
  forgetInDemo,
  listFriends,
  listIncoming,
  listOutgoing,
  respondKnock,
  unfriend,
  type Knock,
  type PersonLite,
} from "@/lib/knocks";

export default function FriendsPage() {
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [incoming, setIncoming] = useState<Knock[]>([]);
  const [outgoing, setOutgoing] = useState<Knock[]>([]);
  const [friends, setFriends] = useState<PersonLite[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([listIncoming(user.id), listOutgoing(user.id), listFriends(user.id)])
      .then(([inc, out, fr]) => {
        if (cancelled) return;
        setIncoming(inc);
        setOutgoing(out);
        setFriends(fr);
      })
      .catch(() => {
        if (!cancelled) {
          setFriends([]);
          showToast("Couldn’t load your friends right now.");
        }
      });
    return () => {
      cancelled = true;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [user, showToast]);

  async function answer(knock: Knock, accept: boolean) {
    if (!user) return;
    const before = incoming;
    setIncoming((list) => list.filter((k) => k.id !== knock.id));
    if (accept) setFriends((list) => [knock.person, ...(list ?? []).filter((p) => p.id !== knock.person.id)]);
    try {
      await respondKnock(user.id, knock, accept);
      // "Not now" is quiet on both sides: no message to them, just a soft note for you.
      showToast(accept ? `${knock.person.name} is in. Welcome them!` : "Okay. They won’t be told.");
    } catch (e) {
      setIncoming(before);
      if (accept) setFriends((list) => (list ?? []).filter((p) => p.id !== knock.person.id));
      showToast((e as Error).message);
    }
  }

  async function takeBack(knock: Knock) {
    if (!user) return;
    setOutgoing((list) => list.filter((k) => k.id !== knock.id));
    try {
      await cancelKnock(user.id, knock);
    } catch (e) {
      setOutgoing((list) => [knock, ...list]);
      showToast((e as Error).message);
    }
  }

  async function removeFriend(person: PersonLite) {
    if (!user) return;
    if (!window.confirm(`Unfriend ${person.name}? They won’t be told.`)) return;
    setFriends((list) => (list ?? []).filter((p) => p.id !== person.id));
    try {
      await unfriend(user.id, person.id);
      showToast(`Unfriended ${person.name}.`);
    } catch (e) {
      setFriends((list) => [person, ...(list ?? [])]);
      showToast((e as Error).message);
    }
  }

  /** Blocking drops their knock and the friendship (server trigger; demo mirrors it). */
  function blocked(id: string) {
    if (!user) return;
    forgetInDemo(user.id, id);
    setIncoming((list) => list.filter((k) => k.person.id !== id));
    setOutgoing((list) => list.filter((k) => k.person.id !== id));
    setFriends((list) => (list ?? []).filter((p) => p.id !== id));
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Friends</h1>
        <p className="mt-1 text-sm text-ink-500">Who’s knocking, and the people who belong in this room.</p>
      </div>

      {incoming.length > 0 && (
        <section aria-labelledby="knocking-heading" className="mb-8">
          <h2 id="knocking-heading" className="mb-3 flex items-center gap-2 font-display text-xl text-ink-900">
            <DoorOpen className="h-5 w-5 text-ember-600" aria-hidden />
            Knocking at the door
            <span className="rounded-full bg-ember-100 px-2 py-0.5 text-xs font-medium text-ember-700">{incoming.length}</span>
          </h2>
          <ul className="space-y-3">
            {incoming.map((k) => (
              <li key={k.id} className="flex items-center gap-3 rounded-3xl border border-ink-100 bg-cream-50 p-4 shadow-card">
                <Avatar name={k.person.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900">{k.person.name}</p>
                  <p className="truncate text-xs text-ink-400">
                    {k.person.handle ? `@${k.person.handle} · ` : ""}knocked {timeAgo(k.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button className="!px-4 !py-2 text-xs" onClick={() => void answer(k, true)}>
                    Let in
                  </Button>
                  <Button variant="secondary" className="!px-4 !py-2 text-xs" onClick={() => void answer(k, false)}>
                    Not now
                  </Button>
                  <ReportMenu subject={k.person.name} subjectId={k.person.id} onBlocked={blocked} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {friends === null ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : friends.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Your circle starts here"
          description="Find people on Hearth and knock on their door."
          actionLabel="Find people"
          actionHref="/people"
          secondaryLabel="Invite a friend"
          onSecondaryClick={() => setInviteOpen(true)}
        />
      ) : (
        <section aria-label="Your friends">
          <div className="grid gap-4 sm:grid-cols-2">
            {friends.map((p) => (
              <div key={p.id} className="flex items-start gap-3 rounded-3xl border border-ink-100 bg-white p-4 shadow-card">
                <Avatar name={p.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">{p.name}</p>
                      {p.handle && <p className="truncate text-xs text-ink-400">@{p.handle}</p>}
                    </div>
                    <ReportMenu subject={p.name} subjectId={p.id} onBlocked={blocked} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="primary" className="!px-3 !py-1.5 text-xs">
                      Message
                    </Button>
                    <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => void removeFriend(p)}>
                      Unfriend
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section aria-labelledby="sent-heading" className="mt-8">
          <h2 id="sent-heading" className="mb-3 text-sm font-medium text-ink-700">Doors you knocked on</h2>
          <ul className="space-y-2">
            {outgoing.map((k) => (
              <li key={k.id} className="flex items-center gap-3 rounded-2xl bg-cream-100 px-4 py-3">
                <Avatar name={k.person.name} size="sm" />
                <p className="min-w-0 flex-1 truncate text-sm text-ink-700">
                  {k.person.name} <span className="text-ink-400">· knocked {timeAgo(k.createdAt)}</span>
                </p>
                <button
                  type="button"
                  onClick={() => void takeBack(k)}
                  className="rounded-full px-3 py-1.5 text-xs text-ink-500 hover:bg-cream-200 hover:text-ink-800"
                >
                  Take back
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900/90 px-4 py-2 text-sm text-cream-50 shadow-soft"
        >
          {toast}
        </div>
      )}

      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </AppShell>
  );
}
