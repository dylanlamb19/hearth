import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { MEDIA_BUCKET } from "@/lib/mediaLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLAIM_BATCH = 500;
const SWEEP_BATCH = 200;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function removeFiles(admin: SupabaseClient, paths: string[], label: string): Promise<boolean> {
  if (paths.length === 0) return true;
  const { error } = await admin.storage.from(MEDIA_BUCKET).remove(paths);
  if (error) console.error(`[hearth] ${label} removal failed`, { count: paths.length, error: error.message });
  return !error;
}

/**
 * Daily (vercel.json):
 * 1) Claim unattached uploads older than 24h (rows deleted first, paths returned) and remove
 *    exactly those files. On failure the rows are put back so the next run retries.
 * 2) Sweep a bounded batch of untracked bucket files older than 24h that no live Moment uses
 *    (files from before upload tracking existed).
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const { data: claimed, error: claimError } = await admin.rpc("claim_orphan_uploads", { max_rows: CLAIM_BATCH });
  if (claimError) {
    console.error("[hearth] orphan claim failed", { error: claimError.message });
    return NextResponse.json({ error: "Claim failed" }, { status: 500 });
  }
  const orphanPaths = ((claimed ?? []) as string[]).filter(Boolean);
  let removed = 0;
  if (await removeFiles(admin, orphanPaths, "orphan")) {
    removed += orphanPaths.length;
  } else {
    const rows = orphanPaths.map((path) => ({
      path,
      owner_id: path.split("/")[0],
      created_at: new Date(0).toISOString(),
      attached: false,
    }));
    const { error } = await admin.from("media_uploads").upsert(rows, { onConflict: "path", ignoreDuplicates: true });
    if (error) console.error("[hearth] orphan requeue failed", { error: error.message });
  }

  const { data: untracked, error: sweepError } = await admin.rpc("find_untracked_media", { max_rows: SWEEP_BATCH });
  if (sweepError) {
    console.error("[hearth] untracked sweep failed", { error: sweepError.message });
  } else {
    const sweepPaths = ((untracked ?? []) as string[]).filter(Boolean);
    if (await removeFiles(admin, sweepPaths, "untracked")) removed += sweepPaths.length;
  }

  return NextResponse.json({ removed });
}
