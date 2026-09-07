"use client";

import Image from "next/image";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { groups } from "@/data/seed";

export default function GroupsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Groups</h1>
        <p className="mt-1 text-sm text-ink-500">Cooking clubs, trail notes, listening rooms.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <article key={g.id} className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
            <div className="relative h-36">
              <Image src={g.cover} alt="" fill className="object-cover" unoptimized sizes="400px" />
            </div>
            <div className="p-4">
              <h2 className="font-medium text-ink-900">{g.name}</h2>
              <p className="mt-1 text-xs text-ink-400">{g.members} members</p>
              <p className="mt-3 text-sm text-ink-600">{g.about}</p>
              <Button className="mt-4" variant="secondary">Join</Button>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
