import { cn, formatRegPlate } from "@/lib/utils";

interface Props {
  registration: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * A UK registration plate in plate yellow, formatted with its space ("OY70 TZG").
 * @import import { RegPlate } from "@/components/shared/reg-plate";
 */
export function RegPlate({ registration, size = "md", className }: Props) {
  // On the type scale like everything else (call 2026-11-01): caption, body,
  // subtitle. formatRegPlate already upper-cases the letters.
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-caption"
      : size === "lg"
        ? "px-3 py-1.5 text-subtitle"
        : "px-2.5 py-1 text-body";
  return (
    <span
      className={cn(
        // UK plate yellow (bg-plate) is the one sanctioned non-token colour;
        // everything around it is a token.
        "inline-block rounded-[3px] border border-(--border-caution) bg-plate font-code font-semibold text-(--text-caution-on-bg-fill) shadow-(--shadow-border-inset)",
        sizeClasses,
        className,
      )}
    >
      {formatRegPlate(registration)}
    </span>
  );
}
