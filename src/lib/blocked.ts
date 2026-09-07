/** Demo block list — subject ids stored in localStorage. */

export const BLOCKED_KEY = "hearth_blocked";

export function getBlockedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BLOCKED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function isBlocked(subjectId: string): boolean {
  return getBlockedIds().includes(subjectId);
}

/** Persist a blocked subject id (idempotent). Returns the updated list. */
export function addBlockedId(subjectId: string): string[] {
  const id = subjectId.trim();
  if (!id) return getBlockedIds();
  const next = Array.from(new Set([...getBlockedIds(), id]));
  try {
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}

/** Remove a blocked subject id. Returns the updated list. */
export function removeBlockedId(subjectId: string): string[] {
  const id = subjectId.trim();
  if (!id) return getBlockedIds();
  const next = getBlockedIds().filter((x) => x !== id);
  try {
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}
