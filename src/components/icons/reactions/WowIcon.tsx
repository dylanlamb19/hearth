import type { SVGProps } from "react";

/** Glow's "Wow" reaction (line icon, uses currentColor). */
export function WowIcon(props: SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="12" r="8.5" /><path d="M9 9.5h.01M15 9.5h.01" /><circle cx="12" cy="15" r="2" />
    </svg>
  );
}
