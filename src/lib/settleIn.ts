"use client";

/**
 * Settle in (Glow's settle-in-onboarding mock): the 3-step welcome and the Home checklist
 * share this progress. Everything here is device-local (localStorage), so it works the same
 * with or without Supabase keys and needs no new tables.
 */
export type SettleStep = "photo" | "people" | "moment";
/** `target` is min(3, people available besides you); unset means the full 3. */
export type SettleProgress = { photo: boolean; knocked: string[]; moment: boolean; done: boolean; target?: number };

export const PEOPLE_GOAL = 3;
export const PROMPTS = [
  "What’s on the stove tonight?",
  "One small good thing today…",
  "Show us your view right now.",
] as const;

const key = (uid: string) => `hearth_settle_in:${uid}`;
const AVATAR_KEY = (uid: string) => `hearth_avatar:${uid}`;
const INVITE_KEY = "hearth_pending_invite";
const FIRST_MOMENT_KEY = "hearth_first_moment";
const NUDGE_KEY = (uid: string) => `hearth_day2_nudge:${uid}`;

const EMPTY: SettleProgress = { photo: false, knocked: [], moment: false, done: false };

function read<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
  } catch {
    /* private mode: progress just isn't remembered */
  }
}

export function getProgress(uid: string): SettleProgress {
  return read(key(uid), EMPTY);
}

export function updateProgress(uid: string, patch: Partial<SettleProgress>): SettleProgress {
  const next = { ...getProgress(uid), ...patch };
  // Once all three are done the checklist goes away for good.
  if (next.photo && stepDone(next, "people") && next.moment) next.done = true;
  write(key(uid), next);
  window.dispatchEvent(new Event("hearth:settle-in"));
  return next;
}

export function stepDone(p: SettleProgress, step: SettleStep): boolean {
  if (step === "photo") return p.photo;
  if (step === "people") return p.knocked.length >= peopleTarget(p);
  return p.moment;
}

/** How many knocks finish the step: min(3, people available besides you). */
export function peopleTarget(p: SettleProgress): number {
  return Math.min(PEOPLE_GOAL, p.target ?? PEOPLE_GOAL);
}

/** Label for the knock step (Glow): the full 3, or "a few" when fewer people are here. */
export function peopleLabel(p: SettleProgress): string {
  return peopleTarget(p) < PEOPLE_GOAL ? "Knock on a few doors" : `Knock on ${PEOPLE_GOAL} doors`;
}

const PHOTO_CARD_KEY = (uid: string) => `hearth_photo_card_dismissed:${uid}`;

/** The soft "Add a photo" card on Home after a skipped photo step; dismissal is remembered. */
export function photoCardDismissed(uid: string): boolean {
  try {
    return localStorage.getItem(PHOTO_CARD_KEY(uid)) === "1";
  } catch {
    return false;
  }
}

export function dismissPhotoCard(uid: string) {
  write(PHOTO_CARD_KEY(uid), "1");
}

/** Rotating prompt: a new one each time the composer opens, steady within a render. */
export function pickPrompt(seed = Date.now()): string {
  return PROMPTS[Math.floor(seed / 1000) % PROMPTS.length];
}

/**
 * Profile photo, kept on this device only. Avatars aren't in Storage yet (the media bucket
 * only signs files attached to a Moment), so it isn't written to profiles.photo_url.
 */
export function getLocalAvatar(uid: string | undefined): string | null {
  if (!uid || typeof window === "undefined") return null;
  try {
    return localStorage.getItem(AVATAR_KEY(uid));
  } catch {
    return null;
  }
}

export function setLocalAvatar(uid: string, dataUrl: string) {
  write(AVATAR_KEY(uid), dataUrl);
  window.dispatchEvent(new Event("hearth:settle-in"));
}

/** Square 256px JPEG data URL; re-encoding through a canvas drops EXIF (including location). */
export async function avatarFromFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  canvas
    .getContext("2d")
    ?.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** /invite/[code] remembers the code so /welcome can suggest whoever invited you. */
export function rememberInvite(code: string) {
  if (code) write(INVITE_KEY, code);
}

export function pendingInviteBase(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const code = localStorage.getItem(INVITE_KEY);
    if (!code) return null;
    const dash = code.indexOf("-");
    return (dash === -1 ? code : code.slice(0, dash)).toLowerCase();
  } catch {
    return null;
  }
}

/** Handoff so Home can show the first Moment on top right after /welcome. */
export type FirstMoment = { id: string; body: string; privacy: "friends" | "everyone"; authorId: string };

export function setFirstMoment(m: FirstMoment) {
  try {
    sessionStorage.setItem(FIRST_MOMENT_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

export function takeFirstMoment(): FirstMoment | null {
  try {
    const raw = sessionStorage.getItem(FIRST_MOMENT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FIRST_MOMENT_KEY);
    return JSON.parse(raw) as FirstMoment;
  } catch {
    return null;
  }
}

/** Day-2 in-app nudge: shown once, from 20h after onboarding. No email or push. */
export function shouldNudge(uid: string, onboardedAt?: string): boolean {
  if (!onboardedAt || typeof window === "undefined") return false;
  if (Date.now() - new Date(onboardedAt).getTime() < 20 * 3_600_000) return false;
  try {
    return localStorage.getItem(NUDGE_KEY(uid)) !== "1";
  } catch {
    return false;
  }
}

export function dismissNudge(uid: string) {
  write(NUDGE_KEY(uid), "1");
}
