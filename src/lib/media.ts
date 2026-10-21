"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  IMAGE_MAX_BYTES,
  IMAGE_MAX_SIDE,
  IMAGE_SOURCE_MAX_BYTES,
  IMAGE_SOURCE_TYPES,
  MEDIA_BUCKET,
  SIGNED_URL_SECONDS,
  VIDEO_MAX_BYTES,
  VIDEO_TYPES,
} from "@/lib/mediaLimits";

export type MediaKind = "image" | "video";
export type UploadedMedia = { path: string; type: MediaKind };

export function mediaKindOf(file: File): MediaKind | null {
  if (IMAGE_SOURCE_TYPES.includes(file.type)) return "image";
  if (file.type in VIDEO_TYPES) return "video";
  return null;
}

/** Friendly reason a file can't be attached, or null if it's fine. */
export function checkMedia(file: File): string | null {
  const kind = mediaKindOf(file);
  if (!kind) return "That file type isn’t supported. Try a photo or an MP4.";
  if (kind === "image" && file.size > IMAGE_SOURCE_MAX_BYTES) return "That photo is too large (25 MB max).";
  if (kind === "video" && file.size > VIDEO_MAX_BYTES) return "Videos can be up to 50 MB.";
  return null;
}

/** Resize to 1600px and re-encode through a canvas, which drops EXIF (including location). */
export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("That photo couldn’t be read.");
  if (blob.size > IMAGE_MAX_BYTES) throw new Error("Photos can be up to 4 MB.");
  return blob;
}

/** Upload through /api/media. Returns null in demo mode (the caller keeps the local preview). */
export async function uploadMedia(file: File): Promise<UploadedMedia | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;
  const problem = checkMedia(file);
  if (problem) throw new Error(problem);

  if (mediaKindOf(file) === "image") {
    const form = new FormData();
    form.append("file", await prepareImage(file), "photo.jpg");
    const res = await fetch("/api/media", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Couldn’t upload that photo.");
    return { path: json.path, type: "image" };
  }

  const res = await fetch("/api/media", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "video", type: file.type, size: file.size }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Couldn’t upload that video.");
  const { error } = await sb.storage.from(MEDIA_BUCKET).uploadToSignedUrl(json.path, json.token, file, {
    contentType: file.type,
  });
  if (error) throw new Error("Couldn’t upload that video. Try again?");
  return { path: json.path, type: "video" };
}

/** Short-lived read URLs. Storage refuses to sign media of deleted or hidden Moments. */
export async function signMediaPaths(paths: string[]): Promise<Record<string, string>> {
  const sb = getSupabaseBrowserClient();
  if (!sb || paths.length === 0) return {};
  const { data } = await sb.storage.from(MEDIA_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}

/** Best-effort removal of a deleted Moment's object (owner-only delete policy). */
export async function removeMedia(path: string | null | undefined): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb || !path) return;
  await sb.storage.from(MEDIA_BUCKET).remove([path]);
}
