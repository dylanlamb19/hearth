import { cn, initials } from "@/lib/utils";

const palette = [
  "bg-ember-100 text-ember-800",
  "bg-cream-300 text-ink-800",
  "bg-amber-100 text-amber-900",
  "bg-stone-200 text-stone-800",
  "bg-orange-100 text-orange-900",
];

export function Avatar({
  name,
  size = "md",
  online,
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base", xl: "h-16 w-16 text-lg" };
  const color = palette[name.length % palette.length];
  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div className={cn("flex items-center justify-center rounded-full font-medium", sizes[size], color)}>
        {initials(name)}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-cream-100 bg-emerald-500" />
      )}
    </div>
  );
}
