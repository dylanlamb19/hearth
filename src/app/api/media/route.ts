import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { IMAGE_MAX_BYTES, IMAGE_MAX_SIDE, MEDIA_BUCKET, VIDEO_MAX_BYTES, VIDEO_TYPES } from "@/lib/mediaLimits";

export const runtime = "nodejs";

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * The only way media gets into the bucket.
 * - multipart "file" (photo): re-encoded here with sharp, which drops EXIF/GPS and all other
 *   metadata, then stored under <user id>/<uuid>.jpg.
 * - JSON { kind: "video", type, size }: returns a one-time signed upload URL for
 *   <user id>/<uuid>.<ext>. Video metadata is NOT stripped (see the PR notes).
 */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) return fail(503, "Uploads aren’t switched on yet.");

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return fail(401, "Please sign in again.");

  const contentType = request.headers.get("content-type") || "";

  if (contentType.startsWith("application/json")) {
    const body = (await request.json().catch(() => null)) as { kind?: string; type?: string; size?: number } | null;
    const ext = body?.type ? VIDEO_TYPES[body.type] : undefined;
    if (body?.kind !== "video" || !ext) return fail(415, "That video type isn’t supported. Try MP4.");
    if (!body.size || body.size > VIDEO_MAX_BYTES) return fail(413, "Videos can be up to 50 MB.");
    const path = `${userId}/${randomUUID()}.${ext}`;
    const { data, error } = await admin.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return fail(500, "Couldn’t start that upload. Try again?");
    return NextResponse.json({ path, token: data.token, type: "video" });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(400, "No photo found.");
  if (file.size > IMAGE_MAX_BYTES) return fail(413, "Photos can be up to 4 MB.");

  let output: Buffer;
  try {
    // sharp writes no metadata unless asked, so EXIF (including GPS) is gone.
    output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: IMAGE_MAX_SIDE, height: IMAGE_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return fail(415, "That photo couldn’t be read. Try a JPEG or PNG.");
  }

  const path = `${userId}/${randomUUID()}.jpg`;
  const { error } = await admin.storage
    .from(MEDIA_BUCKET)
    .upload(path, output, { contentType: "image/jpeg", upsert: false });
  if (error) return fail(500, "Couldn’t upload that photo. Try again?");
  return NextResponse.json({ path, type: "image" });
}
