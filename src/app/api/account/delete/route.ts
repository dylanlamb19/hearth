import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteAccount, verifyPassword } from "@/lib/supabase/deleteAccount";

export const runtime = "nodejs";


/**
 * Deletes the signed-in person's account. Body: { password, confirm: "delete" }.
 * The password is re-checked server-side and the word "delete" must be typed.
 * No UI button yet (privacy page: email us until it ships).
 */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "Not available." }, { status: 503 });
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { password?: unknown; confirm?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  const confirm = typeof body?.confirm === "string" ? body.confirm.trim().toLowerCase() : "";
  if (confirm !== "delete") {
    return NextResponse.json({ error: "Type “delete” to confirm." }, { status: 400 });
  }
  // Rate limit the password check: 5 tries per 15 minutes per person, checked and logged
  // atomically in the database. If that can't be done, refuse.
  const { data: allowed, error: limitError } = await admin.rpc("claim_account_delete_attempt", { uid: user.id });
  if (limitError) {
    console.error("[hearth] delete attempt check failed", { error: limitError.message });
    return NextResponse.json({ error: "Couldn’t check that right now. Try again later." }, { status: 503 });
  }
  if (allowed !== true) {
    return NextResponse.json({ error: "Too many tries. Wait 15 minutes and try again." }, { status: 429 });
  }

  if (!(await verifyPassword(user.id, user.email ?? "", password))) {
    return NextResponse.json({ error: "That password isn’t right." }, { status: 403 });
  }

  try {
    await deleteAccount(admin, user.id);
  } catch (e) {
    console.error("[hearth] account deletion failed", { userId: user.id, error: (e as Error).message });
    return NextResponse.json({ error: "Couldn’t delete your account. Email us and we’ll do it." }, { status: 500 });
  }
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
