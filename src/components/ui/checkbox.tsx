"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn, hitTarget } from "@/lib/utils";
import type React from "react";

export function Checkbox({
  className,
  ...props
}: CheckboxPrimitive.Root.Props): React.ReactElement {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        hitTarget,
        // Genaro Checkbox (.p-checkbox__box): 16px, radius-100, input-border
        // hairline, 2px focus outline; the fill and tick spring in (below).
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-(--radius-100) border border-(--input-border) bg-(--bg-surface) outline-none transition-[border-color,background-color,transform] active:scale-[0.92] data-disabled:active:scale-100 hover:border-(--input-border-hover) hover:bg-(--input-bg-surface-hover) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus) aria-invalid:border-(--border-critical-secondary) aria-invalid:bg-(--bg-surface-critical) data-disabled:cursor-not-allowed data-disabled:border-transparent data-disabled:bg-(--checkbox-bg-surface-disabled) data-checked:border-transparent data-indeterminate:border-transparent",
        className,
      )}
      data-slot="checkbox"
      {...props}
    >
      {/* Genaro's spring check (genaro-bridge.css): the fill swells out of the
          box and the tick draws in. Kept mounted so unchecking can play too. */}
      <CheckboxPrimitive.Indicator
        keepMounted
        className="contents"
        data-slot="checkbox-indicator"
        render={(
          props: React.ComponentProps<"span">,
          state: CheckboxPrimitive.Indicator.State,
        ) => (
          <span {...props}>
            <span className="p-checkbox__fill" aria-hidden />
            <svg className="p-checkbox__mark" viewBox="0 0 16 16" aria-hidden>
              <path
                pathLength={1}
                d={state.indeterminate ? "M4.75 8h6.5" : "M4.5 8.25l2.4 2.4 4.6-4.9"}
              />
            </svg>
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  );
}

