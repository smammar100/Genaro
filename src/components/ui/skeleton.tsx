import { cn } from "@/lib/utils";
import type React from "react";

export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        // Polaris Skeleton: a bg-fill-tertiary block that pulses (the kit's
        // p-pulse keyframes), still under reduced motion.
        "rounded-(--radius-200) bg-(--bg-fill-tertiary) animate-[p-pulse_2s_ease-in-out_infinite] motion-reduce:animate-none",
        className,
      )}
      data-slot="skeleton"
      {...props}
    />
  );
}
