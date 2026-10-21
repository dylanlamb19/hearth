import type { SupabaseClient } from "@supabase/supabase-js";
import { MEDIA_BUCKET } from "@/lib/mediaLimits";

const PAGE = 100;

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
 * Deletes an account: storage folder first (files aren't removed by database cascades), then
 * the auth user, which cascades to profiles, moments, uploads and the rest.
 */
export async function deleteAccount(admin: SupabaseClient, userId: string): Promise<void> {
  await removeUserMedia(admin, userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`delete user failed: ${error.message}`);
}
