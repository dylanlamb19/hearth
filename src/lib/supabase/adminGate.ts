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

/** The admin client if the signed-in user is listed in ADMIN_USER_IDS, otherwise null. */
export async function requireAdmin(): Promise<SupabaseClient | null> {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user || !adminIds().has(data.user.id)) return null;
  return admin;
}
