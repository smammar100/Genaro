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
        // Polaris Checkbox (.p-checkbox__box): 16px, radius-100, input-border
        // hairline, brand fill when checked, 2px focus outline.
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-(--radius-100) border border-(--input-border) bg-(--bg-surface) outline-none transition-[border-color,background-color] hover:border-(--input-border-hover) hover:bg-(--input-bg-surface-hover) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus) aria-invalid:border-(--border-critical-secondary) aria-invalid:bg-(--bg-surface-critical) data-disabled:cursor-not-allowed data-disabled:border-transparent data-disabled:bg-(--checkbox-bg-surface-disabled) data-checked:border-transparent data-indeterminate:border-transparent",
        className,
      )}
      data-slot="checkbox"
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="absolute -inset-px flex items-center justify-center rounded-(--radius-100) text-(--text-brand-on-bg-fill) data-unchecked:hidden data-checked:bg-(--bg-fill-brand-selected) data-indeterminate:bg-(--bg-fill-brand-selected) data-disabled:bg-(--checkbox-bg-surface-disabled) data-disabled:text-(--checkbox-icon-disabled)"
        data-slot="checkbox-indicator"
        render={(
          props: React.ComponentProps<"span">,
          state: CheckboxPrimitive.Indicator.State,
        ) => (
          <span {...props}>
            {state.indeterminate ? (
              <svg
                aria-hidden="true"
                className="size-3.5 sm:size-3"
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M5.252 12h13.496" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="size-3.5 sm:size-3"
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
              </svg>
            )}
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  );
}

