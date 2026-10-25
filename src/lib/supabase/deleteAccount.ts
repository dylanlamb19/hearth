import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MEDIA_BUCKET } from "@/lib/mediaLimits";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

const PAGE = 100;

/**
 * Re-checks the password with a throwaway client (no session saved, the caller's cookies
 * untouched). True only if it signs in as exactly this user.
 */
export async function verifyPassword(userId: string, email: string, password: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !email || !password) return false;
  const probe = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await probe.auth.signInWithPassword({ email, password });
  // Local scope: drop only this throwaway session, never the user's other sessions.
  if (data.session) await probe.auth.signOut({ scope: "local" }).catch(() => undefined);
  return !error && data.user?.id === userId;
}

/** Removes every file under `<userId>/` in the media bucket. Returns how many were removed. */
export async function removeUserMedia(admin: SupabaseClient, userId: string): Promise<number> {
  let removed = 0;
  // Always list from the start: removed files drop out of the listing.
  for (let round = 0; round < 1000; round++) {
    const { data, error } = await admin.storage.from(MEDIA_BUCKET).list(userId, { limit: PAGE });
    if (error) throw new Error(`list failed: ${error.message}`);
    const paths = (data ?? []).filter((f) => f.name).map((f) => `${userId}/${f.name}`);
    if (paths.length === 0) return removed;
    const { error: removeError } = await admin.storage.from(MEDIA_BUCKET).remove(paths);
    if (removeError) throw new Error(`remove failed: ${removeError.message}`);
    removed += paths.length;
  }
  return removed;
}

/**
 * Deletes an account. The auth user goes FIRST (cascading to profiles, Moments, uploads and
 * the rest), so the account is gone even if file removal then fails. Leftover files are
 * untracked and unattached, so the daily cleanup sweep removes them.
 */
export async function deleteAccount(admin: SupabaseClient, userId: string): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`delete user failed: ${error.message}`);
  try {
    await removeUserMedia(admin, userId);
  } catch (e) {
    console.error("[hearth] account files left for the cleanup sweep", { userId, error: (e as Error).message });
  }
}
