"use client";

import { Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { notifications as seedNotes } from "@/data/seed";

export default function NotificationsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Notifications</h1>
        <p className="mt-1 text-sm text-ink-500">Soft pings from people and plans that matter.</p>
      </div>

      {seedNotes.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="You're all caught up"
          tip="When people react or reply, it'll show up here."
        />
      ) : (
        <div className="space-y-2">
          {seedNotes.map((n) => (
            <div
              key={n.id}
              className={"flex items-start justify-between gap-4 rounded-3xl border border-ink-100 bg-white px-4 py-4 shadow-card " + (n.unread ? "ring-1 ring-ember-200" : "")}
            >
              <div>
                <p className="text-sm text-ink-800">{n.text}</p>
                <p className="mt-1 text-xs text-ink-400">{n.time}</p>
              </div>
              {n.unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ember-500" />}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
