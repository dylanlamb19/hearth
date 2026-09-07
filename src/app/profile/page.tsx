"use client";

import Link from "next/link";
import { Ban, Bell, Flag, Plus, Settings, Sparkles } from "lucide-react";
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
  const mine = posts.filter((p) => p.authorId === user?.id);
  // This route is the signed-in user's own profile.
  const isOwnProfile = Boolean(user);

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
              {isOwnProfile && (
                <Link
                  href="/home?compose=1"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-cream-100 px-5 py-2.5 text-sm font-medium text-ink-800 shadow-soft ring-1 ring-ink-100/80 transition hover:bg-cream-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
                >
                  <Plus className="h-4 w-4 opacity-70" strokeWidth={2.25} aria-hidden />
                  Share a Moment
                </Link>
              )}
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

          {isOwnProfile && (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-ink-900">Settings</h2>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 text-xs text-ink-400 transition hover:text-ink-700"
                >
                  <Settings className="h-3.5 w-3.5" aria-hidden />
                  All settings
                </Link>
              </div>
              <div className="mt-2 space-y-2">
                <Link
                  href="/settings"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 border-l-4 border-l-ember-300 bg-cream-50 px-4 py-3 transition hover:bg-cream-100"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Ban className="h-4 w-4 shrink-0 text-ember-500" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink-800">Blocked list</span>
                      <span className="block text-xs text-ink-500">
                        See who you’ve blocked — unblock anytime on this device.
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-ink-400 shrink-0">Open</span>
                </Link>
                <Link
                  href="/help#notifications"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 border-l-4 border-l-ember-300 bg-cream-50 px-4 py-3 transition hover:bg-cream-100"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Bell className="h-4 w-4 shrink-0 text-ember-500" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink-800">Notifications</span>
                      <span className="block text-xs text-ink-500">
                        Gentle pings for reacts, replies, and invites — nothing noisy.
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-ink-400 shrink-0">Help</span>
                </Link>
                <Link
                  href="/help#report-block"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 border-l-4 border-l-ember-300 bg-cream-50 px-4 py-3 transition hover:bg-cream-100"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Flag className="h-4 w-4 shrink-0 text-ember-500" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink-800">Report & block</span>
                      <span className="block text-xs text-ink-500">
                        Calm tools on posts and profiles — no guilt, no red urgency.
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-ink-400 shrink-0">Help</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 space-y-4">
        <h2 className="font-medium text-ink-900">Moments</h2>
        {mine.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-10 w-10" />}
            title="No Moments yet"
            description="Share something quiet from your day — a photo, a thought, a porch update."
            actionLabel="Share a first Moment"
            actionHref="/home?compose=1"
          />
        ) : (
          mine.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </AppShell>
  );
}
