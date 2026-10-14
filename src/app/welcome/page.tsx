"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { ProfileIdentityFields, identityValidation } from "@/components/ProfileIdentityFields";
import { useAuth } from "@/components/AuthProvider";
import { followSuggestions } from "@/lib/social";
import { INTERESTS } from "@/lib/interests";
import { cn, handleFromName, normalizeHandle } from "@/lib/utils";


export default function WelcomePage() {
  const { user, ready, completeOnboarding, updateUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [bio, setBio] = useState("");
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [handleReady, setHandleReady] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [interestNote, setInterestNote] = useState("");

  const suggestions = useMemo(
    // Never offer people you're already connected to.
    () => followSuggestions(user).slice(0, 8),
    [user],
  );

  useEffect(() => {
    if (!user || handleReady) return;
    // Prefill from display name — not raw email local-part.
    const fromName = handleFromName(user.name);
    const current = normalizeHandle(user.handle);
    const looksLikeEmailLocal =
      Boolean(user.email) &&
      current === normalizeHandle(user.email.split("@")[0] || "") &&
      fromName !== current;
    setHandle(looksLikeEmailLocal ? fromName : current || fromName);
    setHandleReady(true);
  }, [user, handleReady]);

  const { effectiveHandle, handleInvalid } = identityValidation(handle, user?.id);

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
    const safeHandle = !handleInvalid && effectiveHandle ? effectiveHandle : handleFromName(user!.name);
    completeOnboarding({
      bio: bio.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
      handle: safeHandle,
      interests,
      followingIds: patch?.followingIds ?? selectedPeople,
    });
    router.push("/home");
  }

  function toggleInterest(chip: string) {
    if (interests.includes(chip)) {
      setInterests(interests.filter((c) => c !== chip));
      setInterestNote("");
      return;
    }
    if (interests.length >= 8) {
      setInterestNote("Eight is plenty for now — tap one to swap it out.");
      return;
    }
    setInterests([...interests, chip]);
    setInterestNote("");
  }

  function togglePerson(id: string) {
    setSelectedPeople((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function continueFromIdentity() {
    if (handleInvalid) return;
    updateUser({
      name: name.trim() || user!.name,
      bio: bio.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
      handle: effectiveHandle,
    });
    setStep(1);
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
            <p className="text-sm text-ink-500">Add a photo, a handle, and a one-line bio so people know who is at the table.</p>
            <ProfileIdentityFields
              selfId={user.id}
              values={{ name: name || user.name, handle, photoUrl, bio }}
              onChange={(next) => {
                setName(next.name);
                setHandle(next.handle);
                setPhotoUrl(next.photoUrl);
                setBio(next.bio);
              }}
              idPrefix="welcome"
            />
            <p className="text-left text-xs text-ink-400">
              You control who sees your Moments; default is Friends once you have a circle.{" "}
              <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="button" className="w-full" disabled={handleInvalid} onClick={continueFromIdentity}>
                Continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  if (!handleInvalid) {
                    updateUser({ handle: effectiveHandle });
                  }
                  setStep(1);
                }}
              >
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
                    aria-pressed={active}
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
            <p className="text-xs text-ink-400" aria-live="polite">
              {interestNote || `${interests.length} selected`}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                className="w-full"
                disabled={interests.length < 3 || interests.length > 8}
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
            <p className="text-sm text-ink-500">People on Hearth you might enjoy.</p>
            <div className="max-h-72 space-y-2 overflow-y-auto text-left">
              {suggestions.map((p) => {
                const selected = selectedPeople.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={selected}
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
