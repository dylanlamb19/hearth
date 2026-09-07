"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { people } from "@/data/seed";
import { cn } from "@/lib/utils";

const INTERESTS = [
  "trails",
  "cooking",
  "design",
  "music",
  "markets",
  "plants",
  "reading",
  "neighbors",
  "baking",
  "bikes",
] as const;

export default function WelcomePage() {
  const { user, ready, completeOnboarding, updateUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);

  const suggestions = useMemo(
    () => people.filter((p) => p.id !== user?.id).slice(0, 8),
    [user?.id],
  );

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100 text-ink-500">
        Warming the room…
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  function finish(patch?: { followingIds?: string[] }) {
    completeOnboarding({
      bio: bio.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
      interests,
      followingIds: patch?.followingIds ?? selectedPeople,
    });
    router.push("/home");
  }

  function toggleInterest(chip: string) {
    setInterests((prev) => {
      if (prev.includes(chip)) return prev.filter((c) => c !== chip);
      if (prev.length >= 8) return prev;
      return [...prev, chip];
    });
  }

  function togglePerson(id: string) {
    setSelectedPeople((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Logo />
          <button type="button" className="text-sm text-ink-500 hover:text-ink-800" onClick={() => finish()}>
            Skip
          </button>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2" aria-label="Progress">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition",
                i === step ? "bg-ember-500" : i < step ? "bg-hearth" : "bg-ink-200",
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4 text-center">
            <h1 className="font-display text-3xl text-ink-900">Face the room</h1>
            <p className="text-sm text-ink-500">Add a photo and a one-line bio so people know who is at the table.</p>
            <div className="mx-auto flex justify-center">
              <Avatar name={user.name} size="xl" />
            </div>
            <label className="block text-left text-sm">
              <span className="mb-1.5 block text-ink-600">Photo URL (optional)</span>
              <input
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-2xl border-ink-200 bg-cream-50 px-4 py-3 text-sm focus:border-ember-400 focus:ring-ember-300"
              />
            </label>
            <label className="block text-left text-sm">
              <span className="mb-1.5 block text-ink-600">One-line bio</span>
              <input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What friends should know"
                maxLength={120}
                className="w-full rounded-2xl border-ink-200 bg-cream-50 px-4 py-3 text-sm focus:border-ember-400 focus:ring-ember-300"
              />
            </label>
            <p className="text-left text-xs text-ink-400">
              You control who sees your posts; default is Friends once you have a circle.{" "}
              <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  updateUser({
                    bio: bio.trim() || undefined,
                    photoUrl: photoUrl.trim() || undefined,
                  });
                  setStep(1);
                }}
              >
                Continue
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(1)}>
                Skip for now
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 text-center">
            <h1 className="font-display text-3xl text-ink-900">What do you care about?</h1>
            <p className="text-sm text-ink-500">Pick 3–8 interests. We will use them to help you find people.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {INTERESTS.map((chip) => {
                const active = interests.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleInterest(chip)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm capitalize transition",
                      active
                        ? "bg-cream-200 text-ink-900 ring-1 ring-ember-200"
                        : "bg-cream-50 text-ink-600 ring-1 ring-ink-100 hover:bg-cream-100",
                    )}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-ink-400">{interests.length} selected</p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                className="w-full"
                disabled={interests.length > 0 && interests.length < 3}
                onClick={() => {
                  updateUser({ interests });
                  setStep(2);
                }}
              >
                Continue
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(2)}>
                Skip for now
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-center">
            <h1 className="font-display text-3xl text-ink-900">Find your people</h1>
            <p className="text-sm text-ink-500">People on Hearth you might enjoy — no fake mutuals.</p>
            <div className="max-h-72 space-y-2 overflow-y-auto text-left">
              {suggestions.map((p) => {
                const selected = selectedPeople.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePerson(p.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition",
                      selected ? "border-ember-200 bg-cream-100" : "border-ink-100 bg-white hover:bg-cream-50",
                    )}
                  >
                    <Avatar name={p.name} size="sm" online={p.online} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
                      <p className="truncate text-xs text-ink-400">@{p.handle}</p>
                    </div>
                    <span className="text-xs text-ink-500">{selected ? "Selected" : "Select"}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="button" className="w-full" onClick={() => finish()}>
                {selectedPeople.length ? "Follow selected" : "Continue"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => finish({ followingIds: [] })}>
                Skip
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
