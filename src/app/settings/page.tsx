"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ban, ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/components/AuthProvider";
import { personById } from "@/data/seed";
import { getBlockedIds, removeBlockedId } from "@/lib/blocked";

type BlockedPerson = {
  id: string;
  name: string;
  handle: string;
};

function resolveBlockedPerson(
  id: string,
  session?: { id: string; name: string; handle: string } | null,
): BlockedPerson {
  const seed = personById(id);
  if (seed) return { id: seed.id, name: seed.name, handle: seed.handle };
  if (session && session.id === id) {
    return { id: session.id, name: session.name, handle: session.handle };
  }
  // Fallback when id is a display name (legacy) or unknown seed id.
  const trimmed = id.trim();
  const asHandle = trimmed
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_]/g, "") || "unknown";
  return { id: trimmed, name: trimmed, handle: asHandle };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<BlockedPerson[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function refreshList() {
    const ids = getBlockedIds();
    setBlocked(ids.map((id) => resolveBlockedPerson(id, user)));
  }

  useEffect(() => {
    refreshList();
    setReady(true);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once; user identity is stable for resolve
  }, [user?.id]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }

  function handleUnblock(id: string, name: string) {
    removeBlockedId(id);
    refreshList();
    showToast(`Unblocked ${name}.`);
  }

  return (
    <AppShell>
      <div className="mb-6">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-ink-500 transition hover:text-ink-800"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Profile
        </Link>
        <h1 className="mt-2 font-display text-3xl text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-ink-500">Quiet controls for your hearth — free tier, on this device.</p>
      </div>

      <section className="rounded-3xl border border-ink-100 border-l-4 border-l-ember-300 bg-white p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-100 text-ember-500 ring-1 ring-ink-100/80">
            <Ban className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="font-medium text-ink-900">Blocked list</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">
              People you’ve blocked won’t show up in your feed or search on this device. Unblock anytime.
            </p>
          </div>
        </div>

        <div className="mt-5">
          {!ready ? (
            <p className="py-8 text-center text-sm text-ink-400">Warming the room…</p>
          ) : blocked.length === 0 ? (
            <EmptyState
              icon={<Ban className="h-10 w-10" />}
              title="No one blocked"
              description="Your list is empty — a soft boundary when you need it, nothing to manage right now."
            />
          ) : (
            <ul className="space-y-3">
              {blocked.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-cream-50 px-4 py-3"
                >
                  <Avatar name={person.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink-900">{person.name}</p>
                    <p className="truncate text-xs text-ink-400">@{person.handle}</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-4 !py-2 text-xs shrink-0"
                    onClick={() => handleUnblock(person.id, person.name)}
                  >
                    Unblock
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="mt-4 text-center text-xs text-ink-400">
        Need the calm how-to?{" "}
        <Link href="/help#report-block" className="underline underline-offset-2 hover:text-ink-600">
          Report &amp; block help
        </Link>
      </p>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900/90 px-4 py-2 text-sm text-cream-50 shadow-soft"
        >
          {toast}
        </div>
      )}
    </AppShell>
  );
}
