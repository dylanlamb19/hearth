"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Files a report in Supabase (reports table, insert-only for users). In demo mode, or for
 * sample content that isn't in the database, it's a no-op; the local hide still happens.
 */
export async function fileReport(input: { momentId?: string; reason: string; note?: string }): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return;
  const momentId = input.momentId && /^[0-9a-f-]{36}$/i.test(input.momentId) ? input.momentId : null;
  // Sample/seed posts aren't in the database; the local hide is all that applies.
  if (!momentId) return;
  // No .select(): reports aren't readable, and insert returns nothing by default.
  const { error } = await sb.from("reports").insert({ moment_id: momentId, reason: input.reason, note: input.note || null });
  // 23505: you already reported this Moment; that's fine.
  if (error && error.code !== "23505") console.warn("[hearth] report failed:", error.message);
}
