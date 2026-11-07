"use client";

import type React from "react";
import { cn } from "@/lib/utils";

/** 28px "…" style icon button for row actions (transparent-fill hover). */
export function RowActionButton({
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button">): React.ReactElement {
  return (
    <button
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-(--radius-200) text-(--icon) outline-none transition-colors hover:bg-(--bg-fill-transparent-hover) hover:text-(--icon-hover) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus) disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
        className,
      )}
      data-slot="row-action-button"
      type={type}
      {...props}
    />
  );
}
