import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { SessionUser } from "@/lib/auth";

export type ProfileRow = {
  id: string;
  name: string | null;
  handle: string | null;
  bio: string | null;
  photo_url: string | null;
  interests: string[] | null;
  onboarding_completed_at: string | null;
  created_at: string;
};

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
  const { data } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as ProfileRow | null) ?? null;
}

/** True when another profile already owns this handle (case-insensitive). */
export async function isHandleTakenInDb(sb: SupabaseClient, handle: string, selfId?: string): Promise<boolean> {
  const { data, error } = await sb.from("profiles").select("id").ilike("handle", handle).limit(1);
  if (error || !data || data.length === 0) return false;
  return data[0].id !== selfId;
}
