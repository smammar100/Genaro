"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";
import type * as React from "react";

export type InputProps = Omit<
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
    "h-7.5 pointer-coarse:h-11 pointer-coarse:leading-11 w-full min-w-0 rounded-[inherit] px-3 leading-7.5 outline-none [transition:background-color_5000000s_ease-in-out_0s] placeholder:text-[#616161]",
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
            "relative inline-flex w-full rounded-lg border border-[#8a8a8a] bg-background text-[13px] text-foreground transition-[border-color,box-shadow] hover:border-[#616161] has-focus-visible:border-[#005bd3] has-focus-visible:ring-1 has-focus-visible:ring-[#005bd3] has-aria-invalid:border-destructive has-aria-invalid:bg-[#fff4f4] has-disabled:border-[#ebebeb] has-disabled:bg-[#f7f7f7] has-disabled:text-[#b5b5b5] has-autofill:bg-foreground/4 dark:bg-input/32",
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

export { InputPrimitive };
