import type { SVGProps } from "react";

/** Glow's "Haha" reaction (line icon, uses currentColor). */
export function HahaIcon(props: SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="12" r="8.5" /><path d="M8.5 10l1.5-1 1.5 1M12.5 10l1.5-1 1.5 1" /><path d="M8 13.5h8a4 4 0 0 1-8 0z" />
    </svg>
  );
}
