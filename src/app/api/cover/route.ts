import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { COVER_BUCKET, COVER_HEIGHT, COVER_MAX_BYTES, COVER_WIDTH } from "@/lib/coverLimits";

export const runtime = "nodejs";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const UPLOAD_LIMIT = 10;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

async function session() {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) return null;
  const { data: auth } = await supabase.auth.getUser();
  return { supabase, admin, userId: auth.user?.id ?? null };
}

/**
 * Cover upload, same pipeline as /api/avatar: decode with sharp, center-crop to 3:1, re-encode
 * (no metadata, so EXIF/GPS is gone), store under <user id>/<uuid>.webp, point
 * profiles.cover_path at it and remove the previous cover. Rate limited per person.
 */
export async function POST(request: NextRequest) {
  const s = await session();
  if (!s) return fail(503, "Uploads aren’t switched on yet.");
  const { supabase, admin, userId } = s;
  if (!userId) return fail(401, "Please sign in again.");

  const { data: existing } = await admin.storage
    .from(COVER_BUCKET)
    .list(userId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  const recent = (existing ?? []).filter(
    (o) => o.created_at && Date.now() - new Date(o.created_at).getTime() < UPLOAD_WINDOW_MS,
  );
  if (recent.length >= UPLOAD_LIMIT) return fail(429, "That’s a lot of new covers. Try again in a few minutes.");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(400, "No photo found.");
  if (file.size > COVER_MAX_BYTES) return fail(413, "Cover photos can be up to 5 MB.");

  let output: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const { format } = await sharp(input).metadata();
    if (!format || !ALLOWED_FORMATS.has(format)) {
      return fail(415, "That photo type isn’t supported. Try a JPEG, PNG or WebP.");
    }
    output = await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(COVER_WIDTH, COVER_HEIGHT, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return fail(415, "That photo couldn’t be read. Try a JPEG or PNG.");
  }

  const path = `${userId}/${randomUUID()}.webp`;
  const { error: upErr } = await admin.storage
    .from(COVER_BUCKET)
    .upload(path, output, { contentType: "image/webp", upsert: false });
  if (upErr) return fail(500, "Couldn’t upload that cover. Try again?");

  // Written with the person's own session, so the profiles RLS and column grants apply.
  const { error: profErr } = await supabase.from("profiles").update({ cover_path: path }).eq("id", userId);
  if (profErr) {
    await admin.storage.from(COVER_BUCKET).remove([path]);
    return fail(500, "Couldn’t save that cover. Try again?");
  }

  const stale = (existing ?? []).map((o) => `${userId}/${o.name}`).filter((p) => p !== path);
  if (stale.length) await admin.storage.from(COVER_BUCKET).remove(stale);

  const { data: signed } = await supabase.storage.from(COVER_BUCKET).createSignedUrl(path, 3600);
  return NextResponse.json({ path, url: signed?.signedUrl ?? null });
}

/** Remove your cover: clears profiles.cover_path and deletes every file in your folder. */
export async function DELETE() {
  const s = await session();
  if (!s) return fail(503, "Uploads aren’t switched on yet.");
  const { supabase, admin, userId } = s;
  if (!userId) return fail(401, "Please sign in again.");

  const { error } = await supabase.from("profiles").update({ cover_path: null }).eq("id", userId);
  if (error) return fail(500, "Couldn’t remove that cover. Try again?");
  const { data: existing } = await admin.storage.from(COVER_BUCKET).list(userId, { limit: 100 });
  const all = (existing ?? []).map((o) => `${userId}/${o.name}`);
  if (all.length) await admin.storage.from(COVER_BUCKET).remove(all);
  return NextResponse.json({ ok: true });
}
