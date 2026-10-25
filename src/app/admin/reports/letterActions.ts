"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/supabase/adminGate";

const UUID = /^[0-9a-f-]{36}$/i;
const idFrom = (form: FormData, key: string) => {
  const id = String(form.get(key) || "");
  return UUID.test(id) ? id : null;
};

async function audit(adminId: string, action: string, targetId: string) {
  const session = await requireAdminSession();
  if (!session) return;
  const { error } = await session.admin.from("admin_audit_log").insert({ admin_id: adminId, action, target_id: targetId });
  if (error) console.error("[hearth] admin audit log failed", { action, targetId, error: error.message });
}

/** Deletes one Letter for both people. Report snapshots keep the text for review. */
export async function removeLetter(form: FormData) {
  const session = await requireAdminSession();
  const id = idFrom(form, "messageId");
  if (!session || !id) return;
  const { error } = await session.admin.from("messages").delete().eq("id", id);
  if (error) return console.error("[hearth] admin remove letter failed", { id, error: error.message });
  await session.admin.from("message_reports").update({ status: "resolved" }).eq("message_id", id).eq("status", "open");
  await audit(session.adminId, "remove_letter", id);
  revalidatePath("/admin/reports");
}

export async function resolveLetterReport(form: FormData) {
  const session = await requireAdminSession();
  const id = idFrom(form, "reportId");
  if (!session || !id) return;
  const { error } = await session.admin.from("message_reports").update({ status: "resolved" }).eq("id", id);
  if (error) return console.error("[hearth] admin resolve letter report failed", { id, error: error.message });
  await audit(session.adminId, "resolve_letter_report", id);
  revalidatePath("/admin/reports");
}

/** Clears the link/phone review flag on a Letter (it stays sent). */
export async function clearLetterReview(form: FormData) {
  const session = await requireAdminSession();
  const id = idFrom(form, "messageId");
  if (!session || !id) return;
  const { error } = await session.admin.from("messages").update({ needs_review: false }).eq("id", id);
  if (error) return console.error("[hearth] admin clear letter review failed", { id, error: error.message });
  await audit(session.adminId, "clear_letter_review", id);
  revalidatePath("/admin/reports");
}

/** Suspends an account (Supabase auth ban). Lift it from the Supabase dashboard. */
export async function suspendUser(form: FormData) {
  const session = await requireAdminSession();
  const id = idFrom(form, "userId");
  if (!session || !id || id === session.adminId) return;
  const { error } = await session.admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
  if (error) return console.error("[hearth] admin suspend failed", { id, error: error.message });
  await audit(session.adminId, "suspend_user", id);
  revalidatePath("/admin/reports");
}
