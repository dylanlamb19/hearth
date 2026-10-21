import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { IMAGE_MAX_BYTES, IMAGE_MAX_SIDE, MEDIA_BUCKET } from "@/lib/mediaLimits";

export const runtime = "nodejs";

// HEIC is left out: sharp's prebuilt binaries usually can't decode it.
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);
const UPLOAD_LIMIT = 20;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * The only way media gets into the bucket.
 * - multipart "file" (photo): re-encoded here with sharp, which drops EXIF/GPS and all other
 *   metadata, then stored under <user id>/<uuid>.jpg.
 * - Anything else (including video) is refused for now.
 */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) return fail(503, "Uploads aren’t switched on yet.");

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return fail(401, "Please sign in again.");

  const contentType = request.headers.get("content-type") || "";

  // Video is off for real accounts: its metadata (which can include location) can't be
  // stripped server-side on the free tier yet.
  if (contentType.startsWith("application/json")) {
    return fail(403, "Video uploads are coming soon. Photos work today.");
  }

  // Rate limit: at most 20 photos per 10 minutes per person, counted from their own folder.
  const { data: recent } = await admin.storage
    .from(MEDIA_BUCKET)
    .list(userId, { limit: UPLOAD_LIMIT, sortBy: { column: "created_at", order: "desc" } });
  const oldest = recent && recent.length >= UPLOAD_LIMIT ? recent[recent.length - 1]?.created_at : null;
  if (oldest && Date.now() - new Date(oldest).getTime() < UPLOAD_WINDOW_MS) {
    return fail(429, "That’s a lot of photos at once. Try again in a few minutes.");
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(400, "No photo found.");
  if (!file.type.startsWith("image/")) return fail(403, "Video uploads are coming soon. Photos work today.");
  if (file.size > IMAGE_MAX_BYTES) return fail(413, "Photos can be up to 4 MB.");

  let output: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    // Trust the decoded format, not the declared MIME type. No SVG, TIFF or anything else.
    const { format } = await sharp(input).metadata();
    if (!format || !ALLOWED_FORMATS.has(format)) {
      return fail(415, "That photo type isn’t supported. Try a JPEG or PNG.");
    }
    // sharp writes no metadata unless asked, so EXIF (including GPS) is gone.
    output = await sharp(input, { limitInputPixels: 50_000_000 })
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
  // Track it so it can be cleaned up if it's never attached to a Moment.
  const { error: trackError } = await admin.from("media_uploads").insert({ path, owner_id: userId });
  if (trackError) console.error("[hearth] media_uploads insert failed", { path, error: trackError.message });
  return NextResponse.json({ path, type: "image" });
}
