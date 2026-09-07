import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2", className)}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M6 22V14c0-5.5 4.5-10 10-10s10 4.5 10 10v8"
          stroke={light ? "#f9f7f2" : "#1a1a18"}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M4 22h24" stroke={light ? "#f9f7f2" : "#1a1a18"} strokeWidth="2" strokeLinecap="round" />
        <path d="M12 22c0-3 1.8-5 4-5s4 2 4 5" stroke={light ? "#ef8f40" : "#e8731a"} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className={cn("font-display text-xl tracking-tight", light ? "text-cream-100" : "text-ink-900")}>
        Hearth
      </span>
    </Link>
  );
}
