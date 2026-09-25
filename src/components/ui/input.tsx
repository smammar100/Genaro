"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";
import type * as React from "react";

type InputProps = Omit<
  InputPrimitive.Props & React.RefAttributes<HTMLInputElement>,
  "size"
> & {
  size?: "sm" | "default" | "lg" | number;
  unstyled?: boolean;
  nativeInput?: boolean;
};

export function Input({
  className,
  size = "default",
  unstyled = false,
  nativeInput = false,
  style,
  ...props
}: InputProps): React.ReactElement {
  const inputClassName = cn(
    "h-7.5 pointer-coarse:h-11 pointer-coarse:leading-11 w-full min-w-0 rounded-[inherit] px-3 leading-7.5 outline-none [transition:background-color_5000000s_ease-in-out_0s] placeholder:text-(--text-secondary)",
    size === "sm" &&
      "h-6.5 pointer-coarse:h-10 pointer-coarse:leading-10 px-2.5 leading-6.5",
    size === "lg" && "h-8.5 leading-8.5",
    props.type === "search" &&
      "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none",
    props.type === "file" &&
      "text-muted-foreground file:me-3 file:bg-transparent file:font-medium file:text-foreground file:text-sm",
  );

  return (
    <span
      className={
        cn(
          !unstyled &&
            // Polaris TextField (.p-field): input tokens, radius-200, a
            // darker hairline + 2px focus outline while focused. Not
            // `relative` on purpose: callers overlay a leading icon as an
            // absolute sibling, and a positioned control would paint its
            // background over it.
            "inline-flex w-full rounded-(--radius-200) border border-(--input-border) bg-(--input-bg-surface) text-[13px] text-(--text) transition-[border-color,background-color] hover:border-(--input-border-hover) hover:bg-(--input-bg-surface-hover) has-focus-visible:border-(--input-border-active) has-focus-visible:bg-(--input-bg-surface-active) has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-(--border-focus) has-aria-invalid:border-(--border-critical-secondary) has-aria-invalid:bg-(--bg-surface-critical) has-disabled:border-transparent has-disabled:bg-(--bg-surface-disabled) has-disabled:text-(--text-disabled) has-autofill:bg-foreground/4",
          className,
        ) || undefined
      }
      data-size={size}
      data-slot="input-control"
      onMouseDown={(event) => {
        // The bordered box is the span, not the control inside it, so a click
        // that lands on its padding or border hits dead space and nothing
        // focuses — the field reads as broken. Any padding a caller adds here
        // (to make room for a leading icon, say) widens that dead strip.
        // Forward those clicks to the control the box is drawn around.
        if (event.target !== event.currentTarget) return;
        const control = event.currentTarget.querySelector<HTMLElement>(
          "[data-slot='input']",
        );
        if (!control) return;
        event.preventDefault();
        control.focus();
      }}
    >
      {nativeInput ? (
        <input
          className={inputClassName}
          data-slot="input"
          size={typeof size === "number" ? size : undefined}
          style={typeof style === "function" ? undefined : style}
          {...props}
        />
      ) : (
        <InputPrimitive
          className={inputClassName}
          data-slot="input"
          size={typeof size === "number" ? size : undefined}
          style={style}
          {...props}
        />
      )}
    </span>
  );
}
