import { getSupabaseServerClient } from "./server";
import { getSupabaseAdminClient } from "./admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/** ADMIN_USER_IDS: comma-separated Supabase user ids (server env). */
export function adminIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_USER_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** The admin client plus the admin's user id, or null if the caller isn't in ADMIN_USER_IDS. */
export async function requireAdminSession(): Promise<{ admin: SupabaseClient; adminId: string } | null> {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user || !adminIds().has(data.user.id)) return null;
  return { admin, adminId: data.user.id };
}

/** The admin client if the signed-in user is listed in ADMIN_USER_IDS, otherwise null. */
export async function requireAdmin(): Promise<SupabaseClient | null> {
  return (await requireAdminSession())?.admin ?? null;
}
