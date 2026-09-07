"use client";

import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { events, personById } from "@/data/seed";

export default function EventsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Events</h1>
        <p className="mt-1 text-sm text-ink-500">RSVP and show up. Keep it local and low-key.</p>
      </div>
      <div className="space-y-4">
        {events.map((e) => {
          const host = personById(e.hostId);
          return (
            <article key={e.id} className="rounded-3xl border border-ink-100 bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl text-ink-900">{e.title}</h2>
                  <p className="mt-2 text-sm text-ink-600">{e.when} · {e.where}</p>
                  <p className="mt-1 text-xs text-ink-400">{e.going} going</p>
                  {host && (
                    <div className="mt-4 flex items-center gap-2">
                      <Avatar name={host.name} size="sm" />
                      <span className="text-sm text-ink-600">Hosted by {host.name}</span>
                    </div>
                  )}
                </div>
                <Button variant="ember">RSVP</Button>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
