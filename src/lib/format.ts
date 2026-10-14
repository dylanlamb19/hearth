const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.345, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  let duration = (d.getTime() - Date.now()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return rtf.format(0, "second");
}

export function formatEventDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const SHORT_UNITS: { seconds: number; label: string }[] = [
  { seconds: 365 * 24 * 3600, label: "y" },
  { seconds: 7 * 24 * 3600, label: "w" },
  { seconds: 24 * 3600, label: "d" },
  { seconds: 3600, label: "h" },
  { seconds: 60, label: "m" },
];

/** Short relative time: "Just now", "20m ago", "3h ago", "2d ago". */
export function shortTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.max(0, (Date.now() - d.getTime()) / 1000);
  for (const unit of SHORT_UNITS) {
    if (seconds >= unit.seconds) return `${Math.floor(seconds / unit.seconds)}${unit.label} ago`;
  }
  return "Just now";
}

const LEGACY_UNIT: Record<string, string> = {
  second: "s", seconds: "s", minute: "m", minutes: "m", min: "m", mins: "m",
  hour: "h", hours: "h", day: "d", days: "d", week: "w", weeks: "w",
  month: "mo", months: "mo", year: "y", years: "y",
};

/**
 * Normalize any time label to the short style. Accepts ISO dates, or seed labels
 * like "3 hours ago", "Yesterday", "Today" (until #23 stores real timestamps).
 */
export function relTime(value: string): string {
  const v = (value || "").trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return shortTimeAgo(v);
  const lower = v.toLowerCase();
  if (lower === "just now" || lower === "now") return "Just now";
  if (lower === "today") return "Today";
  if (lower === "yesterday") return "1d ago";
  const m = /^(\d+)\s*([a-z]+)\s+ago$/.exec(lower);
  if (m && LEGACY_UNIT[m[2]]) return `${m[1]}${LEGACY_UNIT[m[2]]} ago`;
  return v;
}
