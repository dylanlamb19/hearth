"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { removeCover, uploadCover, useCoverSrc } from "@/lib/profileExtras";

/**
 * 3:1 cover above the avatar. Default is a warm cream-to-amber gradient, never a grey box.
 * The owner gets a ghost "Add a cover" pill (v1: center crop only, no drag to reposition).
 */
export function ProfileCover({ uid, name, isOwner }: { uid?: string; name: string; isOwner: boolean }) {
  const src = useCoverSrc(uid);
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

  const pill =
    "inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/40 px-3 py-1.5 text-xs font-medium text-ink-800 backdrop-blur transition hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 disabled:opacity-60";

  return (
    <div className="relative aspect-[3/1] max-h-48 w-full overflow-hidden bg-gradient-to-br from-cream-200 via-cream-100 to-amber-200">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
        <img src={src} alt={`${name}’s cover photo`} className="h-full w-full object-cover object-center" />
      )}
      {isOwner && uid && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPick} aria-label="Choose a cover photo" />
          <button type="button" className={pill} onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden />}
            {src ? "Change cover" : "Add a cover"}
          </button>
          {src && (
            <button type="button" className={pill} onClick={onRemove} disabled={busy} aria-label="Remove cover">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="status" className="absolute bottom-3 left-3 rounded-full bg-cream-50/90 px-3 py-1 text-xs text-ink-700">
          {error}
        </p>
      )}
    </div>
  );
}
