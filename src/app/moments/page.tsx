"use client";

import Image from "next/image";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { moments, personById } from "@/data/seed";

export default function MomentsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Moments</h1>
        <p className="mt-1 text-sm text-ink-500">Photos that last a day. Enough time to see them, not enough to archive them.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {moments.map((m) => {
          const author = personById(m.authorId);
          return (
            <article key={m.id} className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
              <div className="relative aspect-[3/4]">
                <Image src={m.image} alt={m.caption} fill className="object-cover" unoptimized sizes="(max-width:768px) 100vw, 33vw" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/70 to-transparent p-4 text-cream-50">
                  <div className="mb-2 flex items-center gap-2">
                    {author && <Avatar name={author.name} size="sm" />}
                    <div>
                      <p className="text-sm font-medium">{author?.name}</p>
                      <p className="text-xs opacity-80">{m.expiresIn}</p>
                    </div>
                  </div>
                  <p className="text-sm">{m.caption}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
