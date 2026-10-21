"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Files a report in Supabase (reports table, insert-only for users). In demo mode, or for
 * sample content that isn't in the database, it's a no-op; the local hide still happens.
 */
export async function fileReport(input: {
  momentId?: string;
  commentId?: string;
  reason: string;
  note?: string;
}): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return;
  const momentId = input.momentId && /^[0-9a-f-]{36}$/i.test(input.momentId) ? input.momentId : null;
  // Sample/seed posts aren't in the database; the local hide is all that applies.
  if (!momentId) return;
  // No .select(): reports aren't readable, and insert returns nothing by default.
  const commentId = input.commentId && /^[0-9a-f-]{36}$/i.test(input.commentId) ? input.commentId : null;
  const { error } = await sb
    .from("reports")
    .insert({ moment_id: momentId, comment_id: commentId, reason: input.reason, note: input.note || null });
  // 23505: you already reported this Moment; that's fine.
  if (error && error.code !== "23505") console.warn("[hearth] report failed:", error.message);
}

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Reports a person (not a Moment) via the report_user RPC. Demo mode and sample people
 * aren't in the database, so it's a no-op there; throws only on the daily limit.
 */
export async function reportUser(input: { userId: string; reason: string; note?: string }): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb || !UUID.test(input.userId)) return;
  const { error } = await sb.rpc("report_user", { target: input.userId, reason: input.reason, note: input.note || null });
  if (!error) return;
  if (error.code === "HRPT2") throw new Error("That’s a lot of reports for one day. Try again tomorrow.");
  // HRPT1 (generic) is quiet on purpose: same thank-you either way.
  if (error.code !== "HRPT1") console.warn("[hearth] report failed:", error.message);
}
