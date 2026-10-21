"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/supabase/adminGate";
import { MEDIA_BUCKET } from "@/lib/mediaLimits";

const UUID = /^[0-9a-f-]{36}$/i;

function idFrom(form: FormData, key: string): string | null {
  const id = String(form.get(key) || "");
  return UUID.test(id) ? id : null;
}

function logDbError(step: string, error: { message: string } | null, extra: Record<string, unknown>) {
  if (error) console.error(`[hearth] admin ${step} failed`, { ...extra, error: error.message });
}

async function audit(admin: SupabaseClient, adminId: string, action: string, targetId: string) {
  const { error } = await admin.from("admin_audit_log").insert({ admin_id: adminId, action, target_id: targetId });
  logDbError("audit log", error, { action, targetId });
}

async function resolveReports(admin: SupabaseClient, momentId: string) {
  const { error } = await admin
    .from("reports")
    .update({ status: "resolved" })
    .eq("moment_id", momentId)
    .eq("status", "open");
  logDbError("resolve reports", error, { momentId });
}

/** Restore: un-hide the Moment and resolve its open reports. */
export async function restoreMoment(form: FormData) {
  const session = await requireAdminSession();
  const id = idFrom(form, "momentId");
  if (!session || !id) return;
  const { admin, adminId } = session;
  const { error } = await admin.from("moments").update({ hidden_pending_review: false }).eq("id", id);
  logDbError("restore", error, { momentId: id });
  if (error) return;
  await resolveReports(admin, id);
  await audit(admin, adminId, "restore", id);
  revalidatePath("/admin/reports");
}

/** Remove: soft-delete the Moment, remove its file, resolve its open reports. */
export async function removeMoment(form: FormData) {
  const session = await requireAdminSession();
  const id = idFrom(form, "momentId");
  if (!session || !id) return;
  const { admin, adminId } = session;
  const { data, error } = await admin
    .from("moments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("media_path")
    .maybeSingle();
  logDbError("remove", error, { momentId: id });
  if (error) return;
  const path = (data as { media_path: string | null } | null)?.media_path;
  if (path) {
    const { error: fileError } = await admin.storage.from(MEDIA_BUCKET).remove([path]);
    if (fileError) console.error("[hearth] admin file removal failed", { path, error: fileError.message });
  }
  await resolveReports(admin, id);
  await audit(admin, adminId, "remove", id);
  revalidatePath("/admin/reports");
}

/** Mark a flagged account as reviewed. */
export async function resolveFlaggedAccount(form: FormData) {
  const session = await requireAdminSession();
  const userId = idFrom(form, "userId");
  if (!session || !userId) return;
  const { admin, adminId } = session;
  const { error } = await admin.from("flagged_accounts").update({ status: "resolved" }).eq("user_id", userId);
  logDbError("resolve flag", error, { userId });
  if (error) return;
  await audit(admin, adminId, "resolve_flag", userId);
  revalidatePath("/admin/reports");
}
