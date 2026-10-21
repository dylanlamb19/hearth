import type { SVGProps } from "react";

/** Glow's "Sad" reaction (line icon, uses currentColor). */
export function SadIcon(props: SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="12" r="8.5" /><path d="M9 10h.01M15 10h.01" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M16 12.5c.5 1 .5 1.8 0 2.2" />
    </svg>
  );
}
