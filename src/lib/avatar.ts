"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AVATAR_BUCKET } from "@/lib/avatarLimits";
import { avatarFromFile, getLocalAvatar, setLocalAvatar } from "@/lib/settleIn";

const signed = new Map<string, { url: string; at: number }>();
const SIGN_TTL_S = 3600;

/**
 * Upload a profile photo. Real accounts go through /api/avatar (sharp re-encode, EXIF
 * stripped, stored in the avatars bucket); the demo keeps it on this device.
 * Returns a URL to show right away.
 */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  // Shrink and re-encode in the browser first so uploads stay well under the 2 MB cap.
  const dataUrl = await avatarFromFile(file, 512);
  const sb = getSupabaseBrowserClient();
  if (!sb) {
    setLocalAvatar(uid, dataUrl);
    return dataUrl;
  }
  const blob = await (await fetch(dataUrl)).blob();
  const body = new FormData();
  body.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
  const res = await fetch("/api/avatar", { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { url?: string | null; path?: string; error?: string };
  if (!res.ok || !json.path) throw new Error(json.error || "Couldn’t upload that photo. Try again?");
  if (json.url) signed.set(json.path, { url: json.url, at: Date.now() });
  window.dispatchEvent(new CustomEvent("hearth:avatar", { detail: { uid } }));
  return json.url || dataUrl;
}

async function signedAvatarUrl(uid: string): Promise<string | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return getLocalAvatar(uid);
  // Read separately from PROFILE_COLUMNS so profile reads keep working before 0012 is run.
  const { data, error } = await sb.from("profiles").select("avatar_path").eq("id", uid).maybeSingle();
  const path = !error ? (data as { avatar_path?: string | null } | null)?.avatar_path : null;
  if (!path) return null;
  const hit = signed.get(path);
  if (hit && Date.now() - hit.at < (SIGN_TTL_S - 300) * 1000) return hit.url;
  const { data: s } = await sb.storage.from(AVATAR_BUCKET).createSignedUrl(path, SIGN_TTL_S);
  if (!s?.signedUrl) return null;
  signed.set(path, { url: s.signedUrl, at: Date.now() });
  return s.signedUrl;
}

/** The person's current photo URL (or null for initials). Updates after an upload. */
export function useAvatarSrc(uid: string | undefined): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    let live = true;
    const load = () => signedAvatarUrl(uid).then((u) => live && setSrc(u)).catch(() => {});
    load();
    window.addEventListener("hearth:avatar", load);
    window.addEventListener("hearth:settle-in", load);
    return () => {
      live = false;
      window.removeEventListener("hearth:avatar", load);
      window.removeEventListener("hearth:settle-in", load);
    };
  }, [uid]);
  return uid ? src : null;
}
