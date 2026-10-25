import type { ReactElement, SVGProps } from "react";
import type { ReactionKind } from "@/lib/reactionKinds";
import { HahaIcon } from "./HahaIcon";
import { HugIcon } from "./HugIcon";
import { LoveIcon } from "./LoveIcon";
import { SadIcon } from "./SadIcon";
import { WarmIcon } from "./WarmIcon";
import { WowIcon } from "./WowIcon";

const ICONS: Record<ReactionKind, (props: SVGProps<SVGSVGElement>) => ReactElement> = {
  love: LoveIcon,
  warm: WarmIcon,
  haha: HahaIcon,
  hug: HugIcon,
  wow: WowIcon,
  sad: SadIcon,
};

/** Glow's reaction icon for a kind. Colour comes from currentColor; size from className. */
export function ReactionIcon({ kind, ...props }: { kind: ReactionKind } & SVGProps<SVGSVGElement>) {
  const Icon = ICONS[kind];
  return <Icon {...props} />;
}
