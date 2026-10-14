/** Demo joined groups — group ids stored in localStorage on this device. */

export const JOINED_GROUPS_KEY = "hearth_joined_groups";

export function getJoinedGroupIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(JOINED_GROUPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Toggle membership; returns the updated list. */
export function toggleJoinedGroup(groupId: string): string[] {
  const current = getJoinedGroupIds();
  const next = current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId];
  try {
    localStorage.setItem(JOINED_GROUPS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}
