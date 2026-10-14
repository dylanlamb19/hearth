"use client";

import { Avatar } from "./Avatar";
import { people } from "@/data/seed";
import { cn, handleFromName, normalizeHandle } from "@/lib/utils";

export function isHandleTaken(handle: string, selfId?: string) {
  const h = handle.toLowerCase();
  if (!h) return false;
  const owner = people.find((p) => p.handle.toLowerCase() === h);
  if (!owner) return false;
  if (selfId && owner.id === selfId) return false;
  return true;
}

export type IdentityValues = { name: string; handle: string; photoUrl: string; bio: string };

export function identityValidation(handle: string, selfId?: string) {
  const effectiveHandle = normalizeHandle(handle);
  const handleTaken = isHandleTaken(effectiveHandle, selfId);
  const handleInvalid = effectiveHandle.length < 3 || handleTaken;
  return { effectiveHandle, handleTaken, handleInvalid };
}

/** Name, photo, handle, and bio fields — shared by welcome step 1 and Edit profile. */
export function ProfileIdentityFields({
  selfId,
  values,
  onChange,
  idPrefix = "identity",
}: {
  selfId?: string;
  values: IdentityValues;
  onChange: (next: IdentityValues) => void;
  idPrefix?: string;
}) {
  const { effectiveHandle, handleTaken, handleInvalid } = identityValidation(values.handle, selfId);
  const name = values.name.trim() || "You";
  const photo = /^https?:\/\//.test(values.photoUrl.trim()) ? values.photoUrl.trim() : undefined;

  return (
    <div className="space-y-4">
      <div className="mx-auto flex justify-center">
        <Avatar name={name} size="xl" photoUrl={photo} />
      </div>
      <label className="block text-left text-sm" htmlFor={`${idPrefix}-name`}>
        <span className="mb-1.5 block text-ink-600">Name</span>
        <input
          id={`${idPrefix}-name`}
          name="name"
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          placeholder="What friends call you"
          autoComplete="name"
          maxLength={60}
          className="w-full rounded-2xl border-ink-200 bg-cream-50 px-4 py-3 text-sm focus:border-ember-400 focus:ring-ember-300"
        />
      </label>
      <label className="block text-left text-sm" htmlFor={`${idPrefix}-handle`}>
        <span className="mb-1.5 block text-ink-600">Handle</span>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-400">@</span>
          <input
            id={`${idPrefix}-handle`}
            name="handle"
            value={values.handle}
            onChange={(e) => onChange({ ...values, handle: normalizeHandle(e.target.value) })}
            placeholder={handleFromName(name)}
            autoComplete="username"
            spellCheck={false}
            className={cn(
              "w-full rounded-2xl border bg-cream-50 py-3 pl-9 pr-4 text-sm focus:ring-ember-300",
              handleInvalid ? "border-ember-300 focus:border-ember-400" : "border-ink-200 focus:border-ember-400",
            )}
            aria-invalid={handleInvalid}
            aria-describedby={`${idPrefix}-handle-hint`}
          />
        </div>
        <span id={`${idPrefix}-handle-hint`} className="mt-1.5 block text-xs text-ink-400">
          {handleTaken
            ? "That handle is already taken on Hearth. Try another."
            : effectiveHandle.length > 0 && effectiveHandle.length < 3
              ? "Use at least 3 characters."
              : "Prefilled from your name. You can edit it."}
        </span>
      </label>
      <label className="block text-left text-sm" htmlFor={`${idPrefix}-photo`}>
        <span className="mb-1.5 block text-ink-600">Photo URL (optional)</span>
        <input
          id={`${idPrefix}-photo`}
          name="photoUrl"
          type="url"
          value={values.photoUrl}
          onChange={(e) => onChange({ ...values, photoUrl: e.target.value })}
          placeholder="https://…"
          className="w-full rounded-2xl border-ink-200 bg-cream-50 px-4 py-3 text-sm focus:border-ember-400 focus:ring-ember-300"
        />
      </label>
      <label className="block text-left text-sm" htmlFor={`${idPrefix}-bio`}>
        <span className="mb-1.5 block text-ink-600">One-line bio</span>
        <input
          id={`${idPrefix}-bio`}
          name="bio"
          value={values.bio}
          onChange={(e) => onChange({ ...values, bio: e.target.value })}
          placeholder="What friends should know"
          maxLength={120}
          className="w-full rounded-2xl border-ink-200 bg-cream-50 px-4 py-3 text-sm focus:border-ember-400 focus:ring-ember-300"
        />
      </label>
    </div>
  );
}
