import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { SessionUser } from "@/lib/auth";

export type ProfileRow = {
  id: string;
  name: string | null;
  handle: string | null;
  /** Not column-readable since 0013 (bio has a Friends/Everyone setting); read via get_profile_about. */
  bio?: string | null;
  photo_url: string | null;
  interests: string[] | null;
  onboarding_completed_at: string | null;
  created_at: string;
};

export const PROFILE_COLUMNS = "id, name, handle, photo_url, interests, onboarding_completed_at, created_at";

export function profileToSessionUser(authUser: User, row: ProfileRow | null): SessionUser {
  const email = authUser.email ?? "";
  return {
    id: authUser.id,
    email,
    name: row?.name || (authUser.user_metadata?.name as string) || email.split("@")[0] || "Friend",
    handle: row?.handle || "",
    bio: row?.bio ?? undefined,
    photoUrl: row?.photo_url ?? undefined,
    interests: row?.interests ?? undefined,
    onboardingCompletedAt: row?.onboarding_completed_at ?? undefined,
  };
}

export function sessionPatchToRow(patch: Partial<SessionUser>): Partial<ProfileRow> {
  const row: Partial<ProfileRow> = {};
  if ("name" in patch) row.name = patch.name ?? null;
  if ("handle" in patch) row.handle = patch.handle ?? null;
  if ("bio" in patch) row.bio = patch.bio ?? null;
  if ("photoUrl" in patch) row.photo_url = patch.photoUrl ?? null;
  if ("interests" in patch) row.interests = patch.interests ?? null;
  if ("onboardingCompletedAt" in patch) row.onboarding_completed_at = patch.onboardingCompletedAt ?? null;
  return row;
}

export async function fetchProfile(sb: SupabaseClient, id: string): Promise<ProfileRow | null> {
  // birth_year and terms_accepted_at aren't readable through the API (0001 column grants).
  const { data } = await sb.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle();
  return (data as ProfileRow | null) ?? null;
}

/**
 * True when another profile already owns this handle. Handles are stored lowercase
 * (profiles_handle_format), so an exact match on the lowercased value is case-insensitive
 * without ilike wildcards. Throws when the check itself fails, so it's never reported as free.
 */
export async function isHandleTakenInDb(sb: SupabaseClient, handle: string, selfId?: string): Promise<boolean> {
  const { data, error } = await sb.from("profiles").select("id").eq("handle", handle.toLowerCase()).limit(1);
  if (error || !data) throw new Error(error?.message || "Handle check failed");
  return data.length > 0 && data[0].id !== selfId;
}
