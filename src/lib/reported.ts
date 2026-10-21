/** Moments you've reported, hidden for you right away on this device. */
const KEY = "hearth_reported";

export function getReportedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function addReportedId(id: string): void {
  try {
    const ids = getReportedIds();
    if (!ids.includes(id)) localStorage.setItem(KEY, JSON.stringify([...ids, id]));
  } catch {
    /* ignore */
  }
}
