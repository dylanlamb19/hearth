/** Glow's reaction set. Icons: src/components/icons/reactions. */
export const REACTION_KINDS = ["love", "warm", "haha", "hug", "wow", "sad"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];
export const REACTION_LABEL: Record<ReactionKind, string> = {
  love: "Love",
  warm: "Warm",
  haha: "Haha",
  hug: "Hug",
  wow: "Wow",
  sad: "Sad",
};
