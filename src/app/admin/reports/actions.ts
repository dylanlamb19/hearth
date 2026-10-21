"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/adminGate";
import { MEDIA_BUCKET } from "@/lib/mediaLimits";

const UUID = /^[0-9a-f-]{36}$/i;

function momentIdFrom(form: FormData): string | null {
  const id = String(form.get("momentId") || "");
  return UUID.test(id) ? id : null;
}

/** Restore: un-hide the Moment and resolve its open reports. */
export async function restoreMoment(form: FormData) {
  const admin = await requireAdmin();
  const id = momentIdFrom(form);
  if (!admin || !id) return;
  await admin.from("moments").update({ hidden_pending_review: false }).eq("id", id);
  await admin.from("reports").update({ status: "resolved" }).eq("moment_id", id).eq("status", "open");
  revalidatePath("/admin/reports");
}

/** Remove: soft-delete the Moment, remove its file, resolve its open reports. */
export async function removeMoment(form: FormData) {
  const admin = await requireAdmin();
  const id = momentIdFrom(form);
  if (!admin || !id) return;
  const { data } = await admin
    .from("moments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("media_path")
    .maybeSingle();
  const path = (data as { media_path: string | null } | null)?.media_path;
  if (path) {
    const { error } = await admin.storage.from(MEDIA_BUCKET).remove([path]);
    if (error) console.error("[hearth] admin file removal failed", { path, error: error.message });
  }
  await admin.from("reports").update({ status: "resolved" }).eq("moment_id", id).eq("status", "open");
  revalidatePath("/admin/reports");
}

/** Mark a flagged account as reviewed. */
export async function resolveFlaggedAccount(form: FormData) {
  const admin = await requireAdmin();
  const userId = String(form.get("userId") || "");
  if (!admin || !UUID.test(userId)) return;
  await admin.from("flagged_accounts").update({ status: "resolved" }).eq("user_id", userId);
  revalidatePath("/admin/reports");
}
