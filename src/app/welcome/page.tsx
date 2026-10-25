"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { InviteSheet } from "@/components/InviteSheet";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { AudienceChip, type Audience } from "@/components/feed/AudienceChip";
import { people, type Person } from "@/data/seed";
import { listPeople } from "@/lib/follows";
import { sendKnock } from "@/lib/knocks";
import { createMoment } from "@/lib/moments";
import {
  PEOPLE_GOAL,
  avatarFromFile,
  getLocalAvatar,
  getProgress,
  pendingInviteBase,
  pickPrompt,
  setFirstMoment,
  setLocalAvatar,
  updateProgress,
} from "@/lib/settleIn";
import { cn, handleFromName, normalizeHandle } from "@/lib/utils";

function isHandleTaken(handle: string, selfId?: string) {
  const h = handle.toLowerCase();
  if (!h) return false;
  const owner = people.find((p) => p.handle.toLowerCase() === h);
  return Boolean(owner && owner.id !== selfId);
}

/** Small flame dot for the 3-step progress. */
function FlameDot({ state }: { state: "done" | "current" | "todo" }) {
  return (
    <svg
      viewBox="0 0 12 14"
      aria-hidden
      className={cn(
        "h-3.5 w-3 transition",
        state === "done" ? "text-ember-glow" : state === "current" ? "text-ember-500" : "text-ink-200",
      )}
    >
      <path d="M6 1c1.8 2.4 4 4.4 4 7.2A4 4 0 0 1 2 8.2C2 6.6 3 5.4 4 4.4c.2 1.2.8 2 1.6 2.4C5.4 4.8 5.6 2.8 6 1Z" fill="currentColor" />
    </svg>
  );
}

export default function WelcomePage() {
  const { user, ready, completeOnboarding, updateUser, logout, isHandleTaken: isHandleTakenRemote } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [handle, setHandle] = useState("");
  const [handleReady, setHandleReady] = useState(false);
  const [roster, setRoster] = useState<Person[]>([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [knocked, setKnocked] = useState<string[]>([]);
  const [knockError, setKnockError] = useState("");
  const [draft, setDraft] = useState("");
  const [audience, setAudience] = useState<Audience>("friends");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [settled, setSettled] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const prompt = useMemo(() => pickPrompt(), []);

  useEffect(() => {
    if (!user) return;
    setAvatar(getLocalAvatar(user.id));
    setKnocked(getProgress(user.id).knocked);
  }, [user]);

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

  // Suggestions: whoever invited you first, then real profiles (or the demo crew without keys).
  useEffect(() => {
    let live = true;
    listPeople()
      .catch(() => people)
      .then((list) => {
        if (!live) return;
        setRoster(list);
        setRosterLoaded(true);
      });
    return () => {
      live = false;
    };
  }, []);
  const suggestions = useMemo(() => {
    const inviter = pendingInviteBase();
    const others = roster.filter((p) => p.id !== user?.id && p.id !== "u-ember");
    const key = (p: Person) => (p.handle || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
    const first = inviter ? others.filter((p) => key(p) === inviter) : [];
    return [...first, ...others.filter((p) => !first.includes(p))].slice(0, 6);
  }, [roster, user?.id]);
  // Glow: the knock target is min(3, people here besides you), so a small room can still finish.
  const available = useMemo(
    () => roster.filter((p) => p.id !== user?.id && p.id !== "u-ember").length,
    [roster, user?.id],
  );
  const target = Math.min(PEOPLE_GOAL, available);
  useEffect(() => {
    if (!user || !rosterLoaded) return;
    if (getProgress(user.id).target !== target) updateProgress(user.id, { target });
  }, [user, rosterLoaded, target]);

  const effectiveHandle = normalizeHandle(handle);
  const [remoteTaken, setRemoteTaken] = useState<{ handle: string; taken: boolean } | null>(null);
  useEffect(() => {
    if (effectiveHandle.length < 3) return;
    let live = true;
    const t = setTimeout(() => {
      isHandleTakenRemote(effectiveHandle)
        .then((taken) => live && setRemoteTaken({ handle: effectiveHandle, taken }))
        // If the check fails, don't call the handle free.
        .catch(() => live && setRemoteTaken({ handle: effectiveHandle, taken: true }));
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [effectiveHandle, isHandleTakenRemote]);
  const handleChecking = effectiveHandle.length >= 3 && remoteTaken?.handle !== effectiveHandle;
  const handleTaken =
    isHandleTaken(effectiveHandle, user?.id) || (remoteTaken?.handle === effectiveHandle && remoteTaken.taken);
  const handleInvalid = effectiveHandle.length < 3 || handleTaken || handleChecking;

  useEffect(() => {
    if (step === 2) requestAnimationFrame(() => composer.current?.focus());
  }, [step]);

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
  const me = user;
  const firstName = me.name.split(" ")[0] || me.name;

  /** Save the handle (if it's valid) as soon as step 1 is left, skipped or not. */
  function saveHandle() {
    if (!handleInvalid) updateUser({ handle: effectiveHandle });
  }

  function finish(goHome = true) {
    const safeHandle = !handleInvalid && effectiveHandle ? effectiveHandle : me.handle || handleFromName(me.name);
    completeOnboarding({ handle: safeHandle });
    // Finishing Settle in retires the checklist; a skipped photo comes back as one soft card on Home.
    updateProgress(me.id, { done: true });
    if (goHome) router.push("/home");
  }

  async function pickPhoto(files: FileList | null) {
    const file = files?.[0];
    if (photoInput.current) photoInput.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("That isn’t a photo. Try a JPEG or PNG.");
      return;
    }
    try {
      const url = await avatarFromFile(file);
      setLocalAvatar(me.id, url);
      setAvatar(url);
      setPhotoError("");
      updateProgress(me.id, { photo: true });
    } catch {
      setPhotoError("That photo couldn’t be read. Try another?");
    }
  }

  async function knock(p: Person) {
    if (knocked.includes(p.id)) return;
    const next = [...knocked, p.id];
    setKnocked(next);
    setKnockError("");
    try {
      await sendKnock(me.id, { id: p.id, name: p.name, handle: p.handle });
      updateProgress(me.id, { knocked: next });
    } catch (e) {
      setKnocked((list) => list.filter((id) => id !== p.id));
      setKnockError((e as Error).message);
    }
  }

  async function share() {
    const body = draft.trim();
    if (!body || sharing) return;
    setSharing(true);
    setShareError("");
    try {
      const saved = await createMoment({ authorId: me.id, body, visibility: audience });
      setFirstMoment({ id: saved.id, body: saved.body, privacy: saved.privacy, authorId: me.id });
      updateProgress(me.id, { moment: true });
      setSettled(true);
      finish(false);
      // /welcome unmounts on redirect, so Home shows the toast (it reads ?first=1).
      setTimeout(() => router.push("/home?first=1"), 1600);
    } catch (e) {
      setShareError((e as Error).message || "Couldn’t share that — try again.");
      setSharing(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100 px-4 py-10">
      <div
        className={cn(
          "w-full max-w-md rounded-3xl border bg-white p-6 shadow-card transition-all duration-700 sm:p-8",
          settled ? "border-ember-200 bg-ember-100/60 shadow-[0_0_48px_rgba(217,119,6,0.25)]" : "border-ink-100",
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <Logo />
          {!settled && (
            <button
              type="button"
              className="text-sm text-ink-400 hover:text-ink-700"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              Sign out
            </button>
          )}
        </div>

        <div className="mb-6 flex items-center justify-center gap-2" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <FlameDot key={i} state={settled || i < step ? "done" : i === step ? "current" : "todo"} />
          ))}
        </div>

        {settled ? (
          <div className="space-y-3 py-6 text-center" role="status">
            <h1 className="font-display text-3xl text-ink-900">You’re settled in.</h1>
            <p className="text-sm text-ink-500">Taking you home…</p>
          </div>
        ) : (
          <>
            <p className="mb-1 text-center font-display text-2xl text-ink-900">Pull up a chair, {firstName}.</p>

            {step === 0 && (
              <div className="space-y-4 text-center">
                <p className="text-sm text-ink-500">Add a face so friends know it’s you.</p>
                <button
                  type="button"
                  onClick={() => photoInput.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void pickPhoto(e.dataTransfer.files);
                  }}
                  className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-ember-200 bg-cream-50 text-ink-400 transition hover:border-ember-300 hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300"
                  aria-label={avatar ? "Change your photo" : "Add a photo"}
                >
                  {avatar ? (
                    <Avatar name={me.name} src={avatar} size="xl" className="scale-[1.6]" />
                  ) : (
                    <Camera className="h-7 w-7" />
                  )}
                </button>
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => void pickPhoto(e.target.files)}
                />
                {photoError && <p className="text-xs text-ember-700">{photoError}</p>}
                <p className="text-xs text-ink-400">Kept on this device for now.</p>
                <label className="block text-left text-sm">
                  <span className="mb-1.5 block text-ink-600">Handle</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-400">@</span>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(normalizeHandle(e.target.value))}
                      placeholder={handleFromName(me.name)}
                      autoComplete="username"
                      spellCheck={false}
                      className={cn(
                        "w-full rounded-2xl border bg-cream-50 py-3 pl-9 pr-4 text-sm focus:ring-ember-300",
                        handleInvalid && !handleChecking ? "border-ember-300" : "border-ink-200 focus:border-ember-400",
                      )}
                      aria-invalid={handleInvalid}
                      aria-describedby="handle-hint"
                    />
                  </div>
                  <span id="handle-hint" className="mt-1.5 block text-xs text-ink-400">
                    {handleTaken
                      ? "That handle is already taken on Hearth. Try another."
                      : effectiveHandle.length > 0 && effectiveHandle.length < 3
                        ? "Use at least 3 characters."
                        : handleChecking
                          ? "Checking that handle…"
                          : "Prefilled from your name. You can edit it."}
                  </span>
                </label>
                <div className="flex flex-col gap-2 pt-1">
                  {avatar ? (
                    <Button
                      type="button"
                      className="w-full"
                      disabled={handleInvalid}
                      onClick={() => {
                        saveHandle();
                        setStep(1);
                      }}
                    >
                      Continue
                    </Button>
                  ) : (
                    <>
                      <Button type="button" className="w-full" onClick={() => photoInput.current?.click()}>
                        Add a photo
                      </Button>
                      <button
                        type="button"
                        className="text-sm text-ink-500 hover:text-ink-800"
                        onClick={() => {
                          saveHandle();
                          setStep(1);
                        }}
                      >
                        Skip for now
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4 text-center">
                <p className="text-sm text-ink-500">
                  {target < PEOPLE_GOAL ? "Knock on a few doors." : `Knock on ${PEOPLE_GOAL} doors.`} They’ll let you in
                  when they’re ready.
                </p>
                {target > 0 && (
                  <p className="text-xs text-ink-400">
                    {Math.min(knocked.length, target)} of {target}
                  </p>
                )}
                <ul className="max-h-72 space-y-2 overflow-y-auto text-left">
                  {suggestions.map((p) => {
                    const done = knocked.includes(p.id);
                    return (
                      <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-3 py-2.5">
                        <Avatar name={p.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
                          {p.handle && <p className="truncate text-xs text-ink-400">@{p.handle}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => void knock(p)}
                          disabled={done}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-medium transition",
                            done
                              ? "text-ink-400"
                              : "text-ember-700 ring-1 ring-ember-glow hover:bg-ember-50",
                          )}
                        >
                          {done ? "Knocked" : "Knock"}
                        </button>
                      </li>
                    );
                  })}
                  {suggestions.length === 0 && (
                    <li className="rounded-2xl bg-cream-50 px-3 py-4 text-center text-sm text-ink-500">
                      No one else is here yet.{" "}
                      <button
                        type="button"
                        onClick={() => setInviteOpen(true)}
                        className="font-medium text-ember-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300"
                      >
                        Invite someone in.
                      </button>
                    </li>
                  )}
                </ul>
                {knockError && <p className="text-xs text-ember-700">{knockError}</p>}
                <div className="flex flex-col gap-2 pt-1">
                  <Button type="button" className="w-full" onClick={() => setStep(2)}>
                    Continue
                  </Button>
                  <button type="button" className="text-sm text-ink-500 hover:text-ink-800" onClick={() => setStep(2)}>
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-center text-sm text-ink-500">Share your first Moment.</p>
                <div className="rounded-2xl bg-cream-50 p-3 ring-1 ring-ink-100 focus-within:ring-ember-300">
                  <textarea
                    ref={composer}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={prompt}
                    rows={3}
                    maxLength={2000}
                    className="w-full resize-none border-0 bg-transparent p-1 text-sm placeholder:text-ink-400 focus:ring-0"
                    aria-label="Your first Moment"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <AudienceChip value={audience} onChange={setAudience} />
                    <button
                      type="button"
                      onClick={() => void share()}
                      disabled={!draft.trim() || sharing}
                      className="rounded-full bg-ember-glow px-5 py-2 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-50"
                    >
                      {sharing ? "Sharing…" : "Share"}
                    </button>
                  </div>
                </div>
                {shareError && <p className="text-center text-xs text-ember-700">{shareError}</p>}
                <p className="text-center text-xs text-ink-400">
                  Friends is the default.{" "}
                  <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
                </p>
                <div className="text-center">
                  <button type="button" className="text-sm text-ink-500 hover:text-ink-800" onClick={() => finish()}>
                    Later
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
