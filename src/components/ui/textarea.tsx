"use client";

import { Field as FieldPrimitive } from "@base-ui/react/field";
import { mergeProps } from "@base-ui/react/merge-props";
import { cn } from "@/lib/utils";
import type * as React from "react";

type TextareaProps = React.ComponentPropsWithoutRef<"textarea"> &
  React.RefAttributes<HTMLTextAreaElement> & {
    size?: "sm" | "default" | "lg" | number;
    unstyled?: boolean;
  };

export function Textarea({
  className,
  size = "default",
  unstyled = false,
  ref,
  ...props
}: TextareaProps): React.ReactElement {
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
      data-slot="textarea-control"
    >
      <FieldPrimitive.Control
        ref={ref}
        value={props.value}
        defaultValue={props.defaultValue}
        disabled={props.disabled}
        id={props.id}
        name={props.name}
        render={(defaultProps: React.ComponentProps<"textarea">) => (
          <textarea
            className={cn(
              "field-sizing-content min-h-17.5 w-full rounded-[inherit] px-3 py-1.5 leading-5 outline-none placeholder:text-(--text-secondary)",
              size === "sm" &&
                "min-h-16.5 px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(1)-1px)] max-sm:min-h-19.5",
              size === "lg" &&
                "min-h-18.5 py-[calc(--spacing(2)-1px)] max-sm:min-h-21.5",
            )}
            data-slot="textarea"
            {...mergeProps(defaultProps, props)}
          />
        )}
      />
    </span>
  );
}
