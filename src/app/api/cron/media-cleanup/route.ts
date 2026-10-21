import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { MEDIA_BUCKET } from "@/lib/mediaLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const BATCH = 500;

/** Daily (vercel.json): delete uploads never attached to a Moment and older than 24h. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const { data, error } = await admin
    .from("media_uploads")
    .select("path")
    .eq("attached", false)
    .lt("created_at", cutoff)
    .limit(BATCH);
  if (error) {
    console.error("[hearth] orphan cleanup query failed", { error: error.message });
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
  const paths = (data ?? []).map((r: { path: string }) => r.path);
  if (paths.length === 0) return NextResponse.json({ removed: 0 });

  const { error: removeError } = await admin.storage.from(MEDIA_BUCKET).remove(paths);
  if (removeError) {
    console.error("[hearth] orphan file removal failed", { count: paths.length, error: removeError.message });
    return NextResponse.json({ error: "Removal failed" }, { status: 500 });
  }
  const { error: deleteError } = await admin.from("media_uploads").delete().in("path", paths);
  if (deleteError) console.error("[hearth] media_uploads cleanup failed", { error: deleteError.message });
  return NextResponse.json({ removed: paths.length });
}
