/** Age gate: we keep only the birth year, plus a permanent block flag for under-13s. */
export const AGE_BLOCK_KEY = "hearth_age_blocked";
export const MIN_AGE = 13;

/**
 * Under 13 for sure this year. Someone born exactly 13 years ago may still be 12;
 * with only a birth year we let them through. TODO(legal): confirm this rule.
 */
export function isUnderMinAge(birthYear: number, now: Date = new Date()): boolean {
  return now.getFullYear() - birthYear < MIN_AGE;
}

/** Birth years offered in the signup select, newest first. */
export function birthYearOptions(now: Date = new Date()): number[] {
  const thisYear = now.getFullYear();
  return Array.from({ length: 101 }, (_, i) => thisYear - i);
}

export function isAgeBlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(AGE_BLOCK_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  return document.cookie.split("; ").some((c) => c === `${AGE_BLOCK_KEY}=1`);
}

export function setAgeBlocked(): void {
  try {
    localStorage.setItem(AGE_BLOCK_KEY, "1");
  } catch {
    /* ignore */
  }
  document.cookie = `${AGE_BLOCK_KEY}=1; path=/; max-age=${60 * 60 * 24 * 365 * 5}; samesite=lax`;
}
