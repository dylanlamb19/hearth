import type { SessionUser } from "@/lib/auth";
import { people, type Person } from "@/data/seed";

/**
 * Demo social graph (client-only until #25 adds a follows table).
 * Friends are mutual and fixed in seed; Following comes from the session's `followingIds`.
 */
export const FRIEND_IDS = ["u-maya", "u-jordan", "u-sam"] as const;

export function friendIdsFor(user: SessionUser | null | undefined): string[] {
  return FRIEND_IDS.filter((id) => id !== user?.id);
}

export function followingIdsFor(user: SessionUser | null | undefined): string[] {
  return (user?.followingIds ?? []).filter((id) => id !== user?.id);
}

export function isFriend(user: SessionUser | null | undefined, personId: string): boolean {
  return friendIdsFor(user).includes(personId);
}

export function isFollowing(user: SessionUser | null | undefined, personId: string): boolean {
  return followingIdsFor(user).includes(personId);
}

/** Friends or followed — never suggest these as "Follow". */
export function isConnected(user: SessionUser | null | undefined, personId: string): boolean {
  return isFriend(user, personId) || isFollowing(user, personId);
}

/** People you might follow: not you, not already connected, not blocked. */
export function followSuggestions(
  user: SessionUser | null | undefined,
  blockedIds: Iterable<string> = [],
): Person[] {
  const blocked = new Set(blockedIds);
  return people.filter((p) => p.id !== user?.id && !isConnected(user, p.id) && !blocked.has(p.id));
}

export function toggleFollowingIds(user: SessionUser | null | undefined, personId: string): string[] {
  const current = followingIdsFor(user);
  return current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId];
}
