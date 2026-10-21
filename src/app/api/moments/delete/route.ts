import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { MEDIA_BUCKET } from "@/lib/mediaLimits";

export const runtime = "nodejs";

/**
 * Deletes a Moment as the signed-in user (delete_moment RPC enforces ownership), then removes
 * its file with the admin client. The browser never deletes Storage objects itself.
 */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Not available." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Unknown Moment." }, { status: 400 });

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { data: path, error } = await supabase.rpc("delete_moment", { moment_id: id });
  if (error) return NextResponse.json({ error: "Couldn’t delete that Moment." }, { status: 404 });

  if (typeof path === "string" && path && !path.startsWith(`${userId}/`)) {
    // Never remove a file outside the caller's own folder.
    console.error("[hearth] refusing to remove file outside owner folder", { path, userId });
  } else if (typeof path === "string" && path) {
    const admin = getSupabaseAdminClient();
    // Best effort: reads are already refused for deleted Moments.
    // Orphaned uploads (never attached) are swept by a follow-up: forge/chore-media-orphan-cleanup.
    if (!admin) {
      console.error("[hearth] file removal skipped: no admin client", { path });
    } else {
      const { error: removeError } = await admin.storage.from(MEDIA_BUCKET).remove([path]);
      if (removeError) console.error("[hearth] file removal failed", { path, error: removeError.message });
    }
  }
  return NextResponse.json({ ok: true });
}
