"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { BIO_MAX, CITY_MAX, COVER_ALT_MAX, COVER_BUCKET, COVER_MAX_BYTES, type AboutVisibility } from "@/lib/coverLimits";

const signed = new Map<string, { url: string; at: number }>();
const SIGN_TTL_S = 3600;
const LOCAL_COVER = "hearth:cover:";
const LOCAL_ABOUT = "hearth:about:";
const LOCAL_COVER_ALT = "hearth:cover-alt:";

export type About = {
  bio: string | null;
  /** Only returned for your own profile. */
  bioVisibility: AboutVisibility | null;
  city: string | null;
  /** Only returned for your own profile. */
  cityVisibility: AboutVisibility | null;
  interests: string[];
  joinedAt: string | null;
};

const EMPTY_ABOUT: About = { bio: null, bioVisibility: "everyone", city: null, cityVisibility: "friends", interests: [], joinedAt: null };

function readLocal<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Upload a cover. Real accounts go through /api/cover (sharp, EXIF stripped); demo stays on device. */
export async function uploadCover(uid: string, file: File): Promise<string> {
  if (file.size > COVER_MAX_BYTES) throw new Error("Cover photos can be up to 5 MB.");
  const sb = getSupabaseBrowserClient();
  if (!sb) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("That photo couldn’t be read."));
      r.readAsDataURL(file);
    });
    try {
      window.localStorage.setItem(LOCAL_COVER + uid, JSON.stringify(dataUrl));
    } catch {
      throw new Error("That photo is too big for the demo. Try a smaller one.");
    }
    window.dispatchEvent(new CustomEvent("hearth:cover", { detail: { uid } }));
    return dataUrl;
  }
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/cover", { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { url?: string | null; path?: string; error?: string };
  if (!res.ok || !json.path) throw new Error(json.error || "Couldn’t upload that cover. Try again?");
  if (json.url) signed.set(json.path, { url: json.url, at: Date.now() });
  window.dispatchEvent(new CustomEvent("hearth:cover", { detail: { uid } }));
  return json.url || "";
}

/** Remove your cover (back to the warm gradient). Deletes the stored file too. */
export async function removeCover(uid: string): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb) {
    window.localStorage.removeItem(LOCAL_COVER + uid);
    window.localStorage.removeItem(LOCAL_COVER_ALT + uid);
  } else {
    const res = await fetch("/api/cover", { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(json.error || "Couldn’t remove that cover. Try again?");
    }
  }
  window.dispatchEvent(new CustomEvent("hearth:cover", { detail: { uid } }));
}

export type Cover = { src: string | null; alt: string | null };
const NO_COVER: Cover = { src: null, alt: null };

async function loadCover(uid: string): Promise<Cover> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return { src: readLocal<string>(LOCAL_COVER + uid), alt: readLocal<string>(LOCAL_COVER_ALT + uid) };
  // Read separately from PROFILE_COLUMNS so profile reads keep working before 0013 is run.
  const { data, error } = await sb.from("profiles").select("cover_path, cover_alt").eq("id", uid).maybeSingle();
  const row = !error ? (data as { cover_path?: string | null; cover_alt?: string | null } | null) : null;
  const path = row?.cover_path;
  if (!path) return NO_COVER;
  const alt = row?.cover_alt ?? null;
  const hit = signed.get(path);
  if (hit && Date.now() - hit.at < (SIGN_TTL_S - 300) * 1000) return { src: hit.url, alt };
  // Storage RLS (can_see_cover) refuses this across a block, so blocked people get the gradient.
  const { data: s } = await sb.storage.from(COVER_BUCKET).createSignedUrl(path, SIGN_TTL_S);
  if (!s?.signedUrl) return NO_COVER;
  signed.set(path, { url: s.signedUrl, at: Date.now() });
  return { src: s.signedUrl, alt };
}

/** The person's cover (URL + alt text), src null for the default gradient. Updates after changes. */
export function useCover(uid: string | undefined): Cover {
  const [cover, setCover] = useState<Cover>(NO_COVER);
  useEffect(() => {
    if (!uid) return;
    let live = true;
    const load = () => loadCover(uid).then((c) => live && setCover(c)).catch(() => {});
    load();
    window.addEventListener("hearth:cover", load);
    return () => {
      live = false;
      window.removeEventListener("hearth:cover", load);
    };
  }, [uid]);
  return uid ? cover : NO_COVER;
}

/** Save the cover's alt text (optional, up to 120 characters; empty clears it). */
export async function saveCoverAlt(uid: string, text: string): Promise<void> {
  const alt = text.trim().slice(0, COVER_ALT_MAX) || null;
  const sb = getSupabaseBrowserClient();
  if (!sb) {
    if (alt) window.localStorage.setItem(LOCAL_COVER_ALT + uid, JSON.stringify(alt));
    else window.localStorage.removeItem(LOCAL_COVER_ALT + uid);
  } else {
    const { error } = await sb.from("profiles").update({ cover_alt: alt }).eq("id", uid);
    if (error) throw new Error("Couldn’t save that description. Try again?");
  }
  window.dispatchEvent(new CustomEvent("hearth:cover", { detail: { uid } }));
}

/** About as the viewer may see it (Friends-only bio/city and blocks enforced in get_profile_about). */
export async function getAbout(uid: string, fallback?: Partial<About>): Promise<About> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return { ...EMPTY_ABOUT, ...fallback, ...(readLocal<About>(LOCAL_ABOUT + uid) ?? {}) };
  const { data, error } = await sb.rpc("get_profile_about", { target: uid });
  const row = !error && Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
  if (!row) return { ...EMPTY_ABOUT, bioVisibility: null, cityVisibility: null };
  return {
    bio: (row.bio as string | null) ?? null,
    bioVisibility: (row.bio_visibility as AboutVisibility | null) ?? null,
    city: (row.city as string | null) ?? null,
    cityVisibility: (row.city_visibility as AboutVisibility | null) ?? null,
    interests: (row.interests as string[] | null) ?? [],
    joinedAt: (row.joined_at as string | null) ?? null,
  };
}

/** Save your About. Every field is optional; empty strings are stored as nothing. */
export async function saveAbout(
  uid: string,
  input: { bio: string; bioVisibility: AboutVisibility; city: string; cityVisibility: AboutVisibility },
): Promise<void> {
  const bio = input.bio.trim().slice(0, BIO_MAX) || null;
  const city = input.city.trim().slice(0, CITY_MAX) || null;
  const cityVisibility: AboutVisibility = input.cityVisibility === "everyone" ? "everyone" : "friends";
  const bioVisibility: AboutVisibility = input.bioVisibility === "friends" ? "friends" : "everyone";
  const sb = getSupabaseBrowserClient();
  if (!sb) {
    const prev = readLocal<About>(LOCAL_ABOUT + uid) ?? EMPTY_ABOUT;
    window.localStorage.setItem(LOCAL_ABOUT + uid, JSON.stringify({ ...prev, bio, bioVisibility, city, cityVisibility }));
  } else {
    const { error } = await sb.from("profiles").update({ bio, bio_visibility: bioVisibility, city, city_visibility: cityVisibility }).eq("id", uid);
    if (error) throw new Error("Couldn’t save that. Try again?");
  }
  window.dispatchEvent(new CustomEvent("hearth:about", { detail: { uid } }));
}
