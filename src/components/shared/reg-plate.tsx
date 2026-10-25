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
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-micro tracking-[0.08em]"
      : size === "lg"
        ? "px-3 py-1.5 text-subtitle tracking-[0.12em]"
        : "px-2.5 py-1 text-caption tracking-[0.1em]";
  return (
    <span
      className={cn(
        // UK plate yellow (bg-plate) is the one sanctioned non-token colour;
        // everything around it is a token.
        "inline-block rounded-[3px] border border-(--border-caution) bg-plate font-mono font-semibold uppercase text-(--text-caution-on-bg-fill) shadow-(--shadow-border-inset)",
        sizeClasses,
        className,
      )}
    >
      {formatRegPlate(registration)}
    </span>
  );
}
