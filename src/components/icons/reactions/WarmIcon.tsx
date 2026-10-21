import type { SVGProps } from "react";

/** Glow's "Warm" reaction (line icon, uses currentColor). */
export function WarmIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M12 21c3.6 0 6-2.5 6-6 0-3.5-3-5.5-3.5-9-2 1.5-3 3.5-3 5.5-1-.8-1.5-2-1.5-3C7.5 10 6 12.5 6 15c0 3.5 2.4 6 6 6z" />
    </svg>
  );
}
