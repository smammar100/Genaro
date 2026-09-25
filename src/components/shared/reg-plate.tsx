import { cn } from "@/lib/utils";
import { formatRegPlate } from "@/lib/utils";

interface Props {
  registration: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RegPlate({ registration, size = "md", className }: Props) {
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-2xs tracking-[0.08em]"
      : size === "lg"
        ? "px-3 py-1.5 text-base tracking-[0.12em]"
        : "px-2.5 py-1 text-xs tracking-[0.1em]";
  return (
    <span
      className={cn(
        // UK plate yellow (bg-plate) is the one sanctioned non-token colour;
        // everything around it is a token.
        "inline-block rounded-[3px] border border-(--border-caution) bg-plate font-mono font-bold uppercase text-(--text-caution-on-bg-fill) shadow-(--shadow-border-inset)",
        sizeClasses,
        className,
      )}
    >
      {formatRegPlate(registration)}
    </span>
  );
}
