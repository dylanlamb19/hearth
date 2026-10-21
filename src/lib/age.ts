/** Age gate: we keep only the birth year, plus a permanent block flag for under-13s. */
export const AGE_BLOCK_KEY = "hearth_age_blocked";
export const MIN_AGE = 13;

/**
 * With only a birth year we can't tell a 12-year-old from a 13-year-old in the
 * borderline year, so that year is blocked too: birthYear >= currentYear - 13.
 */
export function isUnderMinAge(birthYear: number, now: Date = new Date()): boolean {
  return birthYear >= now.getFullYear() - MIN_AGE;
}

/** Birth years offered in the signup select, newest first. */
export function birthYearOptions(now: Date = new Date()): number[] {
  const thisYear = now.getFullYear();
  return Array.from({ length: 101 }, (_, i) => thisYear - i);
}

// TODO(#22): persist the age block server-side so it survives cleared storage and other devices.
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
