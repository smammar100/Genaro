import { cn } from "@/lib/utils";
import { getDaysInStockColor } from "@/lib/utils";

interface Props {
  days: number;
  className?: string;
}

export function DaysInStockChip({ days, className }: Props) {
  const tone = getDaysInStockColor(days);
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-medium tabular-nums",
        tone === "green" &&
          "bg-[#affebf] text-[#014b40]",
        tone === "amber" &&
          "bg-[#ffeb78] text-[#4f4700]",
        tone === "red" &&
          "bg-[#fed1d7] text-[#8e0b21]",
        className,
      )}
      title={`${days} days in stock`}
    >
      {days}d
    </span>
  );
}
