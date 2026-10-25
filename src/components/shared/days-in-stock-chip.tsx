import { cn, getDaysInStockColor } from "@/lib/utils";

interface Props {
  days: number;
  className?: string;
}

/**
 * A vehicle's days in stock as a chip: green under 30 days, amber under 60, red after.
 * @import import { DaysInStockChip } from "@/components/shared/days-in-stock-chip";
 */
export function DaysInStockChip({ days, className }: Props) {
  const tone = getDaysInStockColor(days);
  return (
    <span
      className={cn(
        "p-badge min-w-9 justify-center tabular-nums",
        tone === "green" && "p-badge--success",
        tone === "amber" && "p-badge--attention",
        tone === "red" && "p-badge--critical",
        className,
      )}
      title={`${days} days in stock`}
    >
      {days}d
    </span>
  );
}
