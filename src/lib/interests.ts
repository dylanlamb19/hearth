/** The 10 interests offered at welcome and used for People chips and seed coverage. */
export const INTERESTS = [
  "trails",
  "cooking",
  "design",
  "music",
  "markets",
  "plants",
  "reading",
  "neighbors",
  "baking",
  "bikes",
] as const;

export type Interest = (typeof INTERESTS)[number];
