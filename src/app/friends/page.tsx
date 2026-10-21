"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UserMinus, Users } from "lucide-react";
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
  // Knocks just let in: the row shows "You and X are friends now." for ~2s, then leaves.
  const [welcomed, setWelcomed] = useState<Record<string, boolean>>({});

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
    if (accept) {
      setWelcomed((w) => ({ ...w, [knock.id]: true }));
    } else {
      // "Not now": the row just leaves. The sender is never told.
      setIncoming((list) => list.filter((k) => k.id !== knock.id));
    }
    try {
      await respondKnock(user.id, knock, accept);
      if (accept) {
        setFriends((list) => [knock.person, ...(list ?? []).filter((p) => p.id !== knock.person.id)]);
        setTimeout(() => {
          setIncoming((list) => list.filter((k) => k.id !== knock.id));
          setWelcomed((w) => {
            const next = { ...w };
            delete next[knock.id];
            return next;
          });
        }, 2000);
      }
    } catch (e) {
      setIncoming(before);
      setWelcomed((w) => {
        const next = { ...w };
        delete next[knock.id];
        return next;
      });
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
    if (!window.confirm(`Remove ${person.name} as a friend? You'll still follow each other.`)) return;
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

      <section aria-labelledby="knocking-heading" className="mb-8">
        <h2 id="knocking-heading" className="mb-3 flex items-center gap-2 font-display text-xl text-ink-900">
          At the door
          {incoming.length > 0 && (
            <span className="rounded-full bg-ember-100 px-2 py-0.5 text-xs font-medium text-ember-700">
              {incoming.length}
            </span>
          )}
        </h2>
        {incoming.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-cream-50 px-4 py-8 text-center">
            <DoorDrawing />
            <p className="text-sm text-ink-500">Nobody knocking right now.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {incoming.map((k) =>
              welcomed[k.id] ? (
                <li
                  key={k.id}
                  role="status"
                  className="flex min-h-[72px] items-center justify-center rounded-3xl bg-cream-50 p-4 text-sm text-ink-700 animate-[fadeOut_2s_ease-in_forwards]"
                >
                  You and {k.person.name} are friends now.
                </li>
              ) : (
                <li key={k.id} className="flex items-center gap-3 rounded-3xl border border-ink-100 bg-cream-50 p-4 shadow-card">
                  <Avatar name={k.person.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink-900">{k.person.name}</p>
                    <p className="truncate text-xs text-ink-400">
                      {k.person.handle ? `@${k.person.handle} · ` : ""}knocked {timeAgo(k.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void answer(k, true)}
                      className="rounded-full bg-ember-glow px-4 py-2 text-xs font-medium text-white transition hover:brightness-95"
                    >
                      Let in
                    </button>
                    <button
                      type="button"
                      onClick={() => void answer(k, false)}
                      className="px-3 py-2 text-xs text-ink-500 underline-offset-2 hover:text-ink-800 hover:underline"
                    >
                      Not now
                    </button>
                    <ReportMenu subject={k.person.name} subjectId={k.person.id} reportPerson onBlocked={blocked} />
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

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
          <ul className="space-y-2">
            {friends.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-3xl border border-ink-100 bg-white p-4 shadow-card">
                <Avatar name={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900">{p.name}</p>
                  {p.handle && <p className="truncate text-xs text-ink-400">@{p.handle}</p>}
                </div>
                <Button variant="ghost" className="!px-3 !py-1.5 text-xs" disabled title="Messages are coming soon">
                  Coming soon
                </Button>
                <ReportMenu
                  subject={p.name}
                  subjectId={p.id}
                  reportPerson
                  onBlocked={blocked}
                  extraItems={[
                    { label: "Unfriend", icon: <UserMinus className="h-4 w-4 text-ink-500" />, onSelect: () => void removeFriend(p) },
                  ]}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section aria-labelledby="sent-heading" className="mt-8">
          <h2 id="sent-heading" className="mb-3 text-sm font-medium text-ink-700">Doors you knocked on</h2>
          <ul className="space-y-2">
            {outgoing.map((k) => (
              <li key={k.id} className="flex items-center gap-3 rounded-2xl bg-cream-100 px-4 py-3 text-ink-500">
                <Avatar name={k.person.name} size="sm" />
                <p className="min-w-0 flex-1 truncate text-sm text-ink-500">
                  {k.person.name} <span className="text-ink-400">· knocked {timeAgo(k.createdAt)}</span>
                </p>
                <button
                  type="button"
                  onClick={() => void takeBack(k)}
                  className="px-3 py-1.5 text-xs text-ink-500 underline-offset-2 hover:text-ink-800 hover:underline"
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

/** Small door line drawing for the empty "At the door" state. */
function DoorDrawing() {
  return (
    <svg width="48" height="56" viewBox="0 0 48 56" fill="none" aria-hidden className="text-ink-300">
      <path d="M10 52V6a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 52h40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="15" y="10" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="31" cy="32" r="1.8" fill="currentColor" className="text-ember-glow" />
    </svg>
  );
}
