"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { videos, personById } from "@/data/seed";

export default function VideosPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Videos</h1>
        <p className="mt-1 text-sm text-ink-500">Short clips worth sitting still for.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {videos.map((v) => {
          const author = personById(v.authorId);
          return (
            <article key={v.id} className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
              <div className="relative aspect-video bg-cream-200">
                <Image src={v.thumb} alt={v.title} fill className="object-cover" unoptimized sizes="400px" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-ink-950/60 p-3 text-white"><Play className="h-5 w-5" /></span>
                </div>
                <span className="absolute bottom-2 right-2 rounded-md bg-ink-950/70 px-1.5 py-0.5 text-[11px] text-white">{v.duration}</span>
              </div>
              <div className="p-4">
                <h2 className="font-medium text-ink-900">{v.title}</h2>
                <p className="mt-1 text-xs text-ink-400">{author?.name} · {v.views} views</p>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
