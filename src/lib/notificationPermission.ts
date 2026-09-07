/** Soft browser-notification permission prompt helpers (local stub; no push server). */

export const PROMPTED_KEY = "hearth_notif_prompted";
export const PROMPTED_AT_KEY = "hearth_notif_prompted_at";
export const PENDING_KEY = "hearth_notif_pending";

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function markFindPeoplePending(): void {
  try {
    sessionStorage.setItem(PENDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Consume the Settle-in “Find people” pending flag. Returns true if it was set. */
export function consumeFindPeoplePending(): boolean {
  try {
    const v = sessionStorage.getItem(PENDING_KEY);
    if (v === "1") {
      sessionStorage.removeItem(PENDING_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function getBrowserPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/** True when we may show the soft prompt (permission default + outside 7-day cooldown). */
export function canAskNotificationPermission(): boolean {
  if (getBrowserPermission() !== "default") return false;
  try {
    const prompted = localStorage.getItem(PROMPTED_KEY);
    if (prompted !== "1") return true;
    const at = localStorage.getItem(PROMPTED_AT_KEY);
    if (!at) return false;
    const then = Date.parse(at);
    if (Number.isNaN(then)) return false;
    return Date.now() - then >= COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** Record that we asked (Enable or Not now). Blocks re-ask for 7 days. */
export function markNotificationPrompted(): void {
  try {
    localStorage.setItem(PROMPTED_KEY, "1");
    localStorage.setItem(PROMPTED_AT_KEY, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}
