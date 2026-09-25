"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn, hitTarget } from "@/lib/utils";
import type React from "react";

/**
 * Radio group.
 *
 * The app had no radio component, so its one radio group (the invoice's VAT
 * scheme) used a bare `<input type="radio">`. A native input with
 * `accent-color: auto` is coloured by the browser, not the design tokens —
 * which is why it rendered red against an otherwise blue UI, and why it could
 * look different per browser and OS.
 *
 * Styling mirrors `checkbox.tsx` so the two read as one family: same size,
 * border, focus ring, invalid treatment and disabled opacity — only the shape
 * and the indicator differ.
 */
export function RadioGroup({
  className,
  ...props
}: RadioGroupPrimitive.Props): React.ReactElement {
  return (
    <RadioGroupPrimitive
      className={cn("flex flex-col gap-2", className)}
      data-slot="radio-group"
      {...props}
    />
  );
}

function Radio({
  className,
  ...props
}: RadioPrimitive.Root.Props): React.ReactElement {
  return (
    <RadioPrimitive.Root
      className={cn(
        hitTarget,
        // Polaris RadioButton (.p-radio__ring): 16px ring in input tokens, brand
        // fill when checked, 2px focus outline.
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-(--input-border) bg-(--input-bg-surface) outline-none transition-[border-color,background-color] hover:border-(--input-border-hover) hover:bg-(--input-bg-surface-hover) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus) data-checked:border-transparent data-checked:bg-(--bg-fill-brand-selected) aria-invalid:border-(--border-critical-secondary) aria-invalid:bg-(--bg-surface-critical) data-disabled:cursor-not-allowed data-disabled:border-transparent data-disabled:bg-(--bg-fill-brand-disabled)",
        className,
      )}
      data-slot="radio"
      {...props}
    >
      <RadioPrimitive.Indicator
        className="size-2 rounded-full bg-(--text-brand-on-bg-fill) data-unchecked:hidden"
        data-slot="radio-indicator"
      />
    </RadioPrimitive.Root>
  );
}

/**
 * Radio with its label, which is the shape every call site actually wants.
 * The whole row is the click target — a 16px dot is a poor one on its own.
 */
export function RadioItem({
  value,
  children,
  className,
  disabled,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 text-sm",
        disabled && "cursor-not-allowed opacity-64",
        className,
      )}
    >
      <Radio value={value} disabled={disabled} />
      {children}
    </label>
  );
}
