"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { notifications as seedNotes } from "@/data/seed";
import {
  canAskNotificationPermission,
  consumeFindPeoplePending,
  markNotificationPrompted,
  requestBrowserNotificationPermission,
} from "@/lib/notificationPermission";
import { NotificationPermissionModal } from "./NotificationPermissionModal";

const BLOCKED_PATHS = ["/welcome", "/signup", "/login"];

/**
 * Soft permission prompt host — never first paint, never every session.
 * Triggers: Settle-in “Find people” pending flag after nav, OR /notifications with unread.
 */
export function NotificationPermissionHost() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const shownThisMount = useRef(false);

  useEffect(() => {
    if (shownThisMount.current) return;
    if (!pathname || BLOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return;
    }
    if (!canAskNotificationPermission()) return;

    const fromFindPeople = consumeFindPeoplePending();
    const onNotificationsWithUnread =
      pathname === "/notifications" && seedNotes.some((n) => n.unread);

    if (!fromFindPeople && !onNotificationsWithUnread) return;

    // Never on first paint — brief settle after navigation
    const t = window.setTimeout(() => {
      if (!canAskNotificationPermission()) return;
      shownThisMount.current = true;
      setOpen(true);
    }, 700);

    return () => window.clearTimeout(t);
  }, [pathname]);

  const closeQuietly = useCallback(() => {
    markNotificationPrompted();
    setOpen(false);
  }, []);

  const onEnable = useCallback(async () => {
    setBusy(true);
    try {
      await requestBrowserNotificationPermission();
      // No guilt copy if denied — just close and record that we asked
      markNotificationPrompted();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <NotificationPermissionModal
      open={open}
      onEnable={onEnable}
      onDismiss={closeQuietly}
      busy={busy}
    />
  );
}
