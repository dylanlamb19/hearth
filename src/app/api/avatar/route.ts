import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, AVATAR_SIDE } from "@/lib/avatarLimits";

export const runtime = "nodejs";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const UPLOAD_LIMIT = 10;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Profile photo upload, same pipeline as /api/media: decode with sharp, crop to a square,
 * re-encode (sharp writes no metadata, so EXIF/GPS is gone), store under <user id>/<uuid>.webp,
 * point profiles.avatar_path at it and remove the previous photo.
 */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) return fail(503, "Uploads aren’t switched on yet.");

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return fail(401, "Please sign in again.");

  const { data: existing } = await admin.storage
    .from(AVATAR_BUCKET)
    .list(userId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  const recent = (existing ?? []).filter(
    (o) => o.created_at && Date.now() - new Date(o.created_at).getTime() < UPLOAD_WINDOW_MS,
  );
  if (recent.length >= UPLOAD_LIMIT) return fail(429, "That’s a lot of new photos. Try again in a few minutes.");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(400, "No photo found.");
  if (file.size > AVATAR_MAX_BYTES) return fail(413, "Profile photos can be up to 2 MB.");

  let output: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const { format } = await sharp(input).metadata();
    if (!format || !ALLOWED_FORMATS.has(format)) {
      return fail(415, "That photo type isn’t supported. Try a JPEG, PNG or WebP.");
    }
    output = await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(AVATAR_SIDE, AVATAR_SIDE, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return fail(415, "That photo couldn’t be read. Try a JPEG or PNG.");
  }

  const path = `${userId}/${randomUUID()}.webp`;
  const { error: upErr } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, output, { contentType: "image/webp", upsert: false });
  if (upErr) return fail(500, "Couldn’t upload that photo. Try again?");

  // Written with the person's own session, so the profiles RLS and column grants apply.
  const { error: profErr } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
  if (profErr) {
    await admin.storage.from(AVATAR_BUCKET).remove([path]);
    return fail(500, "Couldn’t save that photo. Try again?");
  }

  const stale = (existing ?? []).map((o) => `${userId}/${o.name}`).filter((p) => p !== path);
  if (stale.length) await admin.storage.from(AVATAR_BUCKET).remove(stale);

  const { data: signed } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 3600);
  return NextResponse.json({ path, url: signed?.signedUrl ?? null });
}
