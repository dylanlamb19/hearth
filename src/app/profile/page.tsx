"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ReportMenu } from "@/components/ReportMenu";
import { PostCard } from "@/components/PostCard";
import { useAuth } from "@/components/AuthProvider";
import { posts } from "@/data/seed";

export default function ProfilePage() {
  const { user } = useAuth();
  const [empty, setEmpty] = useState(false);
  const mine = posts.slice(0, 2);

  return (
    <AppShell>
      <section className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
        <div className="h-36 bg-gradient-to-r from-cream-300 via-ember-100 to-cream-200" />
        <div className="relative px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="rounded-full bg-white p-1 shadow-soft">
                <Avatar name={user?.name || "You"} size="xl" />
              </div>
              <div className="pb-1">
                <h1 className="font-display text-3xl text-ink-900">{user?.name}</h1>
                <p className="text-sm text-ink-500">@{user?.handle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary">Edit profile</Button>
              <ReportMenu subject="your profile tools" />
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-600">
            Keeping the lights low and the kettle on. Friends-only by default. You decide who sits at this table.
          </p>
          <div className="mt-4 rounded-2xl bg-cream-100 px-4 py-3 text-xs text-ink-600">
            Privacy: your profile is visible to friends. Use report and block anytime. Read more in our{" "}
            <a href="/privacy" className="underline underline-offset-2">privacy notice</a>.
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-medium text-ink-900">Moments</h2>
          <Button variant="outline" onClick={() => setEmpty((v) => !v)}>
            {empty ? "Show demo Moments" : "Preview empty state"}
          </Button>
        </div>
        {empty ? (
          <EmptyState
            icon={<Sparkles className="h-10 w-10" />}
            title="No Moments yet"
            description="Share something quiet from your day — a photo, a thought, a porch update."
            actionLabel="Share a first Moment"
            actionHref="/home"
          />
        ) : (
          mine.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </AppShell>
  );
}
