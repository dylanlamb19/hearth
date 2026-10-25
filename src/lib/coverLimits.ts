/** Shared by the browser and /api/cover. Keep in sync with 0013_profile_cover_about.sql. */
export const COVER_BUCKET = "covers";
/** Bucket and upload cap. */
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
/** Stored covers are 3:1, center-cropped (v1: no drag to reposition). */
export const COVER_WIDTH = 1500;
export const COVER_HEIGHT = 500;
/** About limits. */
export const BIO_MAX = 160;
export const CITY_MAX = 60;
export type AboutVisibility = "friends" | "everyone";
