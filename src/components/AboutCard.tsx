"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/Button";
import { getAbout, saveAbout, type About } from "@/lib/profileExtras";
import { BIO_MAX, CITY_MAX, type AboutVisibility } from "@/lib/coverLimits";

function joinedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Joined ${d.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
}

/**
 * Short About card under the name. All fields optional (no phone, address or birthday).
 * Owner with nothing filled in sees "Tell people a little about you."; visitors see nothing.
 */
export function AboutCard({ uid, isOwner, fallback }: { uid?: string; isOwner: boolean; fallback?: Partial<About> }) {
  const [about, setAbout] = useState<About | null>(null);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [vis, setVis] = useState<AboutVisibility>("friends");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fallbackKey = JSON.stringify(fallback ?? {});

  useEffect(() => {
    if (!uid) return;
    let live = true;
    const load = () => getAbout(uid, JSON.parse(fallbackKey)).then((a) => live && setAbout(a)).catch(() => {});
    load();
    window.addEventListener("hearth:about", load);
    return () => {
      live = false;
      window.removeEventListener("hearth:about", load);
    };
  }, [uid, fallbackKey]);

  if (!uid || !about) return null;

  function startEdit() {
    setBio(about?.bio ?? "");
    setCity(about?.city ?? "");
    setVis(about?.cityVisibility ?? "friends");
    setError(null);
    setEditing(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    setError(null);
    try {
      await saveAbout(uid, { bio, city, cityVisibility: vis });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save that. Try again?");
    } finally {
      setSaving(false);
    }
  }

  if (isOwner && editing) {
    return (
      <form onSubmit={onSave} className="mt-4 max-w-xl space-y-3 rounded-2xl border border-ink-100 bg-cream-50 p-4">
        <label className="block text-xs font-medium text-ink-700">
          Bio <span className="font-normal text-ink-400">(optional · everyone can see it)</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            rows={2}
            className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
            placeholder="A line about you"
          />
          <span className="block text-right text-[11px] text-ink-400">{bio.length}/{BIO_MAX}</span>
        </label>
        <label className="block text-xs font-medium text-ink-700">
          City <span className="font-normal text-ink-400">(optional · just the city, never your address)</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value.slice(0, CITY_MAX))}
            className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
            placeholder="e.g. Austin"
          />
        </label>
        <fieldset className="text-xs text-ink-700">
          <legend className="font-medium">Who sees your city</legend>
          <div className="mt-1 flex gap-4">
            {(["friends", "everyone"] as const).map((v) => (
              <label key={v} className="inline-flex items-center gap-1.5">
                <input type="radio" name="city-vis" checked={vis === v} onChange={() => setVis(v)} className="accent-ember-600" />
                {v === "friends" ? "Friends" : "Everyone"}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p role="status" className="text-xs text-ink-700">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </form>
    );
  }

  const joined = joinedLabel(about.joinedAt);
  const hasContent = Boolean(about.bio || about.city || about.interests.length);

  if (!hasContent) {
    if (!isOwner) return joined ? <p className="mt-4 text-xs text-ink-500">{joined}</p> : null;
    return (
      <button
        type="button"
        onClick={startEdit}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-dashed border-ember-200 bg-cream-50 px-4 py-3 text-sm text-ink-600 transition hover:bg-cream-100"
      >
        <Pencil className="h-4 w-4 text-ember-500" aria-hidden />
        Tell people a little about you.
      </button>
    );
  }

  return (
    <div className="mt-4 max-w-xl space-y-2">
      {about.bio && <p className="text-sm leading-relaxed text-ink-600">{about.bio}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
        {about.city && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {about.city}
            {isOwner && <span className="text-ink-400">· {about.cityVisibility === "everyone" ? "Everyone" : "Friends"}</span>}
          </span>
        )}
        {joined && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {joined}
          </span>
        )}
        {isOwner && (
          <button type="button" onClick={startEdit} className="inline-flex items-center gap-1 text-ink-400 hover:text-ink-700">
            <Pencil className="h-3 w-3" aria-hidden /> Edit About
          </button>
        )}
      </div>
      {about.interests.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Here for">
          {about.interests.map((t) => (
            <li key={t} className="rounded-full bg-cream-100 px-2.5 py-1 text-xs text-ink-700">{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
