"use client";

import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { notifications as seedNotes } from "@/data/seed";
import { isUnread, markAllRead, markRead, useReadIds } from "@/lib/notifications";

export default function NotificationsPage() {
  const router = useRouter();
  const readIds = useReadIds();
  const anyUnread = seedNotes.some((n) => isUnread(n.id, readIds));

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-900">Notifications</h1>
          <p className="mt-1 text-sm text-ink-500">Soft pings from people and plans that matter.</p>
        </div>
        {anyUnread && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-sm text-ink-500 underline-offset-2 hover:text-ink-800 hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {seedNotes.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="You’re all caught up"
          tip="When people react or reply, it’ll show up here."
        />
      ) : (
        <ul className="space-y-2">
          {seedNotes.map((n) => {
            const unread = isUnread(n.id, readIds);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    markRead(n.id);
                    router.push(n.href);
                  }}
                  className={
                    "flex w-full items-start justify-between gap-4 rounded-3xl border border-ink-100 bg-white px-4 py-4 text-left shadow-card transition hover:bg-cream-50 " +
                    (unread ? "ring-1 ring-ember-200" : "")
                  }
                >
                  <div>
                    <p className="text-sm text-ink-800">{n.text}</p>
                    <p className="mt-1 text-xs text-ink-400">{n.time}</p>
                  </div>
                  {unread && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ember-500" aria-label="Unread" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
