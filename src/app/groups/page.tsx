"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { groups } from "@/data/seed";
import { getJoinedGroupIds, toggleJoinedGroup } from "@/lib/groups";

export default function GroupsPage() {
  const [joined, setJoined] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setJoined(getJoinedGroupIds());
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function handleJoin(id: string, name: string) {
    const next = toggleJoinedGroup(id);
    setJoined(next);
    setToast(next.includes(id) ? `You joined ${name}` : `You left ${name}`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Groups</h1>
        <p className="mt-1 text-sm text-ink-500">Cooking clubs, trail notes, listening rooms.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => {
          const isJoined = joined.includes(g.id);
          const members = g.members + (isJoined ? 1 : 0);
          return (
            <article
              key={g.id}
              className="flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card"
            >
              <div className="relative h-36">
                <Image src={g.cover} alt="" fill className="object-cover" unoptimized sizes="400px" />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-medium text-ink-900">{g.name}</h2>
                <p className="mt-1 text-xs text-ink-400">{members} members</p>
                <p className="mb-4 mt-3 text-sm text-ink-600">{g.about}</p>
                <Button
                  className="mt-auto self-start"
                  variant="secondary"
                  aria-pressed={isJoined}
                  onClick={() => handleJoin(g.id, g.name)}
                >
                  {isJoined ? "Joined" : "Join"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-ink-100 bg-cream-50 px-4 py-2 text-sm text-ink-800 shadow-soft"
        >
          {toast}
        </div>
      )}
    </AppShell>
  );
}
