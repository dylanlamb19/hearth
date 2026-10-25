"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Type, X } from "lucide-react";
import { removeCover, saveCoverAlt, uploadCover, useCover } from "@/lib/profileExtras";
import { COVER_ALT_MAX } from "@/lib/coverLimits";

/**
 * 3:1 cover above the avatar. Default is a warm cream (#FBF6EE) to ~18% amber gradient, never a grey box.
 * The owner gets a ghost "Add a cover" pill (v1: center crop only, no drag to reposition).
 */
export function ProfileCover({ uid, name, isOwner }: { uid?: string; name: string; isOwner: boolean }) {
  const { src, alt } = useCover(uid);
  const [altOpen, setAltOpen] = useState(false);
  const [altText, setAltText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uid) return;
    setBusy(true);
    setError(null);
    try {
      await uploadCover(uid, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t upload that cover. Try again?");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!uid) return;
    setBusy(true);
    setError(null);
    try {
      await removeCover(uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t remove that cover. Try again?");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveAlt(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setBusy(true);
    setError(null);
    try {
      await saveCoverAlt(uid, altText);
      setAltOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save that description. Try again?");
    } finally {
      setBusy(false);
    }
  }

  const pill =
    "inline-flex items-center gap-1.5 rounded-full border border-cream-50/80 bg-cream-50/60 px-3 py-1.5 text-xs font-medium text-ink-800 backdrop-blur transition hover:bg-cream-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 disabled:opacity-60";

  return (
    <div className="relative aspect-[3/1] max-h-48 w-full overflow-hidden bg-gradient-to-br from-cream-cover to-ember-glow/[0.18]">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
        <img src={src} alt={alt?.trim() || `${name}’s cover photo`} className="h-full w-full object-cover object-center" />
      )}
      {isOwner && uid && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPick} aria-label="Choose a cover photo" />
          <button type="button" className={pill} onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 strokeWidth={1.75} className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ImagePlus strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />}
            {src ? "Change cover" : "Add a cover"}
          </button>
          {src && (
            <button
              type="button"
              className={pill}
              onClick={() => {
                setAltText(alt ?? "");
                setAltOpen((o) => !o);
              }}
              disabled={busy}
              aria-expanded={altOpen}
            >
              <Type strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
              {alt ? "Edit alt text" : "Add alt text"}
            </button>
          )}
          {src && (
            <button type="button" className={pill} onClick={onRemove} disabled={busy} aria-label="Remove cover">
              <X strokeWidth={1.75} className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      )}
      {isOwner && uid && src && altOpen && (
        <form onSubmit={onSaveAlt} className="absolute inset-x-3 top-3 flex items-center gap-2 rounded-2xl bg-cream-50/95 p-2 shadow-soft">
          <label className="sr-only" htmlFor="cover-alt">Describe your cover for people using screen readers</label>
          <input
            id="cover-alt"
            value={altText}
            onChange={(e) => setAltText(e.target.value.slice(0, COVER_ALT_MAX))}
            maxLength={COVER_ALT_MAX}
            placeholder="Describe your cover (optional)"
            className="min-w-0 flex-1 rounded-xl border border-ink-100 bg-white px-3 py-1.5 text-xs text-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
          />
          <span className="text-[11px] text-ink-400">{altText.length}/{COVER_ALT_MAX}</span>
          <button type="submit" className={pill} disabled={busy}>Save</button>
        </form>
      )}
      {error && (
        <p role="status" className="absolute bottom-3 left-3 rounded-full bg-cream-50/90 px-3 py-1 text-xs text-ink-700">
          {error}
        </p>
      )}
    </div>
  );
}
