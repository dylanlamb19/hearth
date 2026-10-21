import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteAccount } from "@/lib/supabase/deleteAccount";

export const runtime = "nodejs";

/**
 * Deletes the signed-in person's account, including their `<uid>/` photo folder.
 * No UI button yet (privacy page: email us until it ships); also usable by an admin handling
 * an email request by calling deleteAccount() server-side.
 */
export async function POST() {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "Not available." }, { status: 503 });
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  try {
    await deleteAccount(admin, userId);
  } catch (e) {
    console.error("[hearth] account deletion failed", { userId, error: (e as Error).message });
    return NextResponse.json({ error: "Couldn’t delete your account. Email us and we’ll do it." }, { status: 500 });
  }
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
