/** Client-safe Supporter constants. Cosmetic thank-yous only; nothing core is ever gated on these. */
export const SUPPORTER_FRAMES = ["ember", "hearthstone", "sage-leaf", "candle"] as const;
export type SupporterFrame = (typeof SUPPORTER_FRAMES)[number];

export const SUPPORTER_TINTS = {
  amber: { label: "Amber", hex: "#D97706" },
  terracotta: { label: "Terracotta", hex: "#C2553A" },
  sage: { label: "Sage", hex: "#7A8B6F" },
  plum: { label: "Plum", hex: "#7A4E6B" },
} as const;
export type SupporterTint = keyof typeof SUPPORTER_TINTS;

export const FRAME_LABELS: Record<SupporterFrame, string> = {
  ember: "Ember",
  hearthstone: "Hearthstone",
  "sage-leaf": "Sage leaf",
  candle: "Candle",
};

export const PLANS = {
  monthly: { label: "Monthly", price: "$4", per: "month" },
  yearly: { label: "Yearly", price: "$36", per: "year" },
} as const;
export type SupporterPlan = keyof typeof PLANS;

export const GRACE_DAYS = 7;

/** Public cosmetic perks for one person (null = not a supporter, or the feature is off). */
export type PublicPerks = { frame: SupporterFrame | null; tint: SupporterTint; showDot: boolean };

/** What the owner sees on Settings > Hearth Supporter. */
export type SupporterMe = {
  status: "inactive" | "active" | "past_due" | "canceled";
  plan: SupporterPlan | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: string | null;
  isSupporter: boolean;
  isAdult: boolean;
  paymentsReady: boolean;
  perks: PublicPerks;
};

export function isFrame(v: unknown): v is SupporterFrame {
  return typeof v === "string" && (SUPPORTER_FRAMES as readonly string[]).includes(v);
}
export function isTint(v: unknown): v is SupporterTint {
  return typeof v === "string" && v in SUPPORTER_TINTS;
}
export function isPlan(v: unknown): v is SupporterPlan {
  return v === "monthly" || v === "yearly";
}
