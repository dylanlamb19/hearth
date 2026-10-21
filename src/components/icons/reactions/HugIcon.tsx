import type { SVGProps } from "react";

/** Glow's "Hug" reaction (line icon, uses currentColor). */
export function HugIcon(props: SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="8" r="3" /><path d="M5 14c2 3 4.5 4.5 7 4.5s5-1.5 7-4.5" /><path d="M7.5 17.5L5 20M16.5 17.5L19 20" />
    </svg>
  );
}
