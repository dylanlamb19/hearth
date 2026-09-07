import Link from "next/link";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "ember";

const styles: Record<Variant, string> = {
  primary: "bg-hearth text-white hover:bg-hearth-dark",
  secondary: "bg-white text-ink-900 border border-ink-200 hover:bg-cream-100",
  outline: "bg-transparent text-ink-900 border border-ink-300 hover:bg-cream-200",
  ghost: "bg-transparent text-ink-700 hover:bg-cream-200",
  ember: "bg-ember-500 text-white hover:bg-ember-600",
};

export function Button({
  children,
  className,
  variant = "primary",
  href,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  href?: string;
}) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 disabled:opacity-50",
    styles[variant],
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
