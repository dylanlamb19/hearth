/** Shared by the browser and /api/media. Keep in sync with 0004_media.sql. */
export const MEDIA_BUCKET = "moment-media";
/** Longest side after resizing. */
export const IMAGE_MAX_SIDE = 1600;
/**
 * Max photo upload after resizing. Ember asked for 5 MB, but Vercel caps function request
 * bodies at 4.5 MB, so photos stop at 4 MB (a 1600px JPEG is usually well under 1 MB).
 */
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
/** Max original photo we'll try to resize in the browser. */
export const IMAGE_SOURCE_MAX_BYTES = 25 * 1024 * 1024;
/** Video cap for the demo's local preview. Real-account video uploads are off for now. */
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const IMAGE_SOURCE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
/** Signed read URLs live this long. */
export const SIGNED_URL_SECONDS = 10 * 60;
