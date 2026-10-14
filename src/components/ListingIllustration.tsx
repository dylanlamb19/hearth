import type { Listing } from "@/data/seed";

/** Cream line drawings for listings without a photo — same stroke style as the empty states. */
export function ListingIllustration({ kind, label }: { kind: NonNullable<Listing["illustration"]>; label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-cream-100">
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-label={label}
        className="h-24 w-24 text-ink-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === "skillet" && (
          <>
            <circle cx="26" cy="34" r="16" />
            <circle cx="26" cy="34" r="12" />
            <path d="M41 28l17-8a2.5 2.5 0 0 1 2 4.5L43 33" />
            <path d="M20 16c1-2-1-4 0-6M26 15c1-2-1-4 0-6M32 16c1-2-1-4 0-6" stroke="#e8731a" />
          </>
        )}
        {kind === "stool" && (
          <>
            <rect x="16" y="18" width="32" height="6" rx="2" />
            <path d="M20 24l-4 28M44 24l4 28M28 24l-1 28M36 24l1 28" />
            <path d="M18 40h28" />
            <path d="M28 18c0-5 3-9 8-10M34 18c1-4 4-6 8-6" stroke="#e8731a" />
          </>
        )}
        {kind === "monstera" && (
          <>
            <path d="M32 58V34" />
            <path d="M32 34C18 34 10 24 12 12c10-2 20 2 20 22z" />
            <path d="M32 34c14 0 22-10 20-22-10-2-20 2-20 22z" />
            <path d="M18 18l7 7M15 26l9 3M46 18l-7 7M49 26l-9 3" />
            <path d="M24 58h16" stroke="#e8731a" />
          </>
        )}
      </svg>
    </div>
  );
}
