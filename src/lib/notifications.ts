"use client";

import { useEffect, useState } from "react";
import { notifications } from "@/data/seed";

/** Demo read state — notification ids marked read on this device. */
export const READ_NOTIFICATIONS_KEY = "hearth_notifications_read";
const CHANGE_EVENT = "hearth:notifications-read";

export function getReadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeReadIds(ids: string[]) {
  try {
    localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function markRead(id: string) {
  writeReadIds([...getReadIds(), id]);
}

export function markAllRead() {
  writeReadIds(notifications.map((n) => n.id));
}

export function isUnread(id: string, readIds: string[]): boolean {
  const n = notifications.find((x) => x.id === id);
  return Boolean(n?.unread) && !readIds.includes(id);
}

/** Live read-id list; updates when any component marks something read. */
export function useReadIds(): string[] {
  const [readIds, setReadIds] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setReadIds(getReadIds());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return readIds;
}

export function useUnreadCount(): number {
  const readIds = useReadIds();
  return notifications.filter((n) => isUnread(n.id, readIds)).length;
}
