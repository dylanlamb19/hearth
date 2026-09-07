"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { PostCard } from "@/components/PostCard";
import { ReportMenu } from "@/components/ReportMenu";
import { useAuth } from "@/components/AuthProvider";
import { personByHandle, posts, resolveHandle } from "@/data/seed";

export default function PublicProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = resolveHandle(params?.handle || "");
  const { user } = useAuth();

  const seeded = personByHandle(handle);
  const isSessionMatch = Boolean(user && resolveHandle(user.handle) === handle);

  const profile = seeded
    ? { id: seeded.id, name: seeded.name, handle: seeded.handle, bio: seeded.bio }
    : isSessionMatch && user
      ? {
          id: user.id,
          name: user.name,
          handle: user.handle,
          bio: "Keeping the lights low and the kettle on. Friends-only by default. You decide who sits at this table.",
        }
      : null;

  if (!profile) {
    return (
      <AppShell>
        <EmptyState
          icon={<Sparkles className="h-10 w-10" />}
          title="Person not found"
          description="That handle isn’t at this hearth. Try another friend, or head home."
          actionLabel="Back home"
          actionHref="/home"
        />
      </AppShell>
    );
  }

  const theirs = posts.filter((p) => p.authorId === profile.id);
  const isOwnProfile = Boolean(user && user.id === profile.id);

  return (
    <AppShell>
      <section className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
        <div className="h-36 bg-gradient-to-r from-cream-300 via-ember-100 to-cream-200" />
        <div className="relative px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="rounded-full bg-white p-1 shadow-soft">
                <Avatar name={profile.name} size="xl" />
              </div>
              <div className="pb-1">
                <h1 className="font-display text-3xl text-ink-900">{profile.name}</h1>
                <p className="text-sm text-ink-500">@{profile.handle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center rounded-full bg-cream-100 px-5 py-2.5 text-sm font-medium text-ink-800 shadow-soft ring-1 ring-ink-100/80 transition hover:bg-cream-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
                >
                  Your profile
                </Link>
              ) : (
                <ReportMenu subject={profile.name} subjectId={profile.id} />
              )}
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-600">{profile.bio}</p>
          <div className="mt-4 rounded-2xl bg-cream-100 px-4 py-3 text-xs text-ink-600">
            Privacy: profiles are visible to friends. Use report and block anytime. Read more in our{" "}
            <a href="/privacy" className="underline underline-offset-2">
              privacy notice
            </a>
            .
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-4">
        <h2 className="font-medium text-ink-900">Moments</h2>
        {theirs.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-10 w-10" />}
            title="No Moments yet"
            description={
              isOwnProfile
                ? "Share something quiet from your day — a photo, a thought, a porch update."
                : `${profile.name} hasn’t shared a Moment here yet.`
            }
            {...(isOwnProfile
              ? { actionLabel: "Share a first Moment", actionHref: "/home?compose=1" }
              : {})}
          />
        ) : (
          theirs.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </AppShell>
  );
}
