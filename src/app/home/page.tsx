"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Image as ImageIcon, Video, Smile } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/Button";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useAuth } from "@/components/AuthProvider";
import { posts, people } from "@/data/seed";
import { cn } from "@/lib/utils";

const tabs = ["For you", "Following", "Friends", "Nearby"];
const FIRST_MOMENT_PLACEHOLDER = "What's happening by the hearth?";

function HearthMark({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <path
        d="M6 22V14c0-5.5 4.5-10 10-10s10 4.5 10 10v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M4 22h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 22c0-3 1.8-5 4-5s4 2 4 5" stroke="#e8731a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const composerRef = useRef<HTMLInputElement>(null);
  const [compose, setCompose] = useState(false);
  const [tab, setTab] = useState("For you");
  const birthdays = people.filter((p) => p.birthday);
  const suggestions = people.filter((p) => p.id !== "u-ember" && p.id !== user?.id).slice(0, 3);
  const contacts = people.filter((p) => p.id !== "u-ember" && p.id !== user?.id);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("compose") !== "1") return;
    setCompose(true);
    requestAnimationFrame(() => composerRef.current?.focus());
  }, []);

  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <OnboardingChecklist />

          <section className="rounded-3xl border border-ink-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name || "You"} />
              <input
                ref={composerRef}
                placeholder={compose ? FIRST_MOMENT_PLACEHOLDER : "What is on your mind?"}
                className="w-full rounded-full border-0 bg-cream-100 px-4 py-3 text-sm placeholder:text-ink-400 focus:ring-2 focus:ring-ember-300"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-ink-600 hover:bg-cream-100">
                <ImageIcon className="h-4 w-4 text-ember-500" /> Photo
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-ink-600 hover:bg-cream-100">
                <Video className="h-4 w-4 text-ember-500" /> Video
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-ink-600 hover:bg-cream-100">
                <Smile className="h-4 w-4 text-ember-500" /> Feeling
              </button>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm",
                  tab === t ? "bg-hearth text-white" : "bg-white text-ink-600 ring-1 ring-ink-100 hover:bg-cream-50",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          <div className="h-16" aria-hidden />

          <div className="sticky bottom-4 z-20 pt-2">
            <Link
              href="/clips"
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-cream-100 text-ink-800 shadow-[0_4px_24px_rgba(26,26,24,0.12)] ring-1 ring-ink-100/80 transition hover:bg-cream-50 hover:shadow-[0_6px_28px_rgba(26,26,24,0.14)] active:scale-[0.99]"
            >
              <HearthMark className="text-ink-900" />
              <span className="text-[15px] font-medium tracking-tight">Watch Clips</span>
            </Link>
          </div>
        </div>

        <aside className="hidden space-y-4 xl:block">
          <section className="rounded-3xl border border-ink-100 bg-white p-4 shadow-card">
            <h2 className="font-medium text-ink-900">Birthdays</h2>
            {birthdays.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">No birthdays today.</p>
            ) : (
              birthdays.map((p) => (
                <div key={p.id} className="mt-3 flex items-center gap-3">
                  <Avatar name={p.name} size="sm" />
                  <p className="text-sm text-ink-700"><span className="font-medium">{p.name}</span> · {p.birthday}</p>
                </div>
              ))
            )}
          </section>

          <section className="rounded-3xl border border-ink-100 bg-white p-4 shadow-card">
            <h2 className="font-medium text-ink-900">Suggested for you</h2>
            <div className="mt-3 space-y-3">
              {suggestions.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Avatar name={p.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{p.name}</p>
                    <p className="text-xs text-ink-400">{p.mutuals} mutuals</p>
                  </div>
                  <Button variant="secondary" className="!px-3 !py-1.5 text-xs">Follow</Button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-ink-100 bg-white p-4 shadow-card">
            <h2 className="font-medium text-ink-900">Contacts</h2>
            <div className="mt-3 space-y-3">
              {contacts.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Avatar name={p.name} size="sm" online={p.online} />
                  <p className="text-sm text-ink-700">{p.name}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
