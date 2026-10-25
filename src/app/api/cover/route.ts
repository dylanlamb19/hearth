import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { COVER_BUCKET, COVER_HEIGHT, COVER_MAX_BYTES, COVER_WIDTH } from "@/lib/coverLimits";

export const runtime = "nodejs";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

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
 * profiles.cover_path at it and remove the previous cover. Rate limited per person (10 per
 * 10 minutes, logged in cover_upload_attempts). cover_path is service-role only, so this is the
 * only way a cover gets stored.
 */
export async function POST(request: NextRequest) {
  const s = await session();
  if (!s) return fail(503, "Uploads aren’t switched on yet.");
  const { supabase, admin, userId } = s;
  if (!userId) return fail(401, "Please sign in again.");

  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > COVER_MAX_BYTES + 64 * 1024) return fail(413, "Cover photos can be up to 5 MB.");

  const { data: allowed, error: limitError } = await admin.rpc("claim_cover_upload", { uid: userId });
  if (limitError) return fail(503, "Couldn’t check that right now. Try again later.");
  if (allowed !== true) return fail(429, "That’s a lot of new covers. Try again in a few minutes.");

  const { data: existing } = await admin.storage.from(COVER_BUCKET).list(userId, { limit: 100 });

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

  // cover_path isn't client-writable (0013), so set it with the service role, own row only.
  const { error: profErr } = await admin.from("profiles").update({ cover_path: path }).eq("id", userId);
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
  const { admin, userId } = s;
  if (!userId) return fail(401, "Please sign in again.");

  const { error } = await admin.from("profiles").update({ cover_path: null, cover_alt: null }).eq("id", userId);
  if (error) return fail(500, "Couldn’t remove that cover. Try again?");
  const { data: existing } = await admin.storage.from(COVER_BUCKET).list(userId, { limit: 100 });
  const all = (existing ?? []).map((o) => `${userId}/${o.name}`);
  if (all.length) await admin.storage.from(COVER_BUCKET).remove(all);
  return NextResponse.json({ ok: true });
}
