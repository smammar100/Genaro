"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";

/**
 * Badge — the Polaris Badge, drawn with the kit's `p-badge` classes
 * (src/components/polaris/styles/components.css): 20px tall, radius-200,
 * 12px medium text, tone colours from the theme tokens.
 *
 * The Polaris tones are variants of their own (neutral, info, success,
 * attention, warning, critical, magic); the older names map onto them:
 *   default / secondary → neutral · error / destructive → critical ·
 *   outline → a surface chip with a hairline (Polaris has no outline badge).
 */
const badgeVariants = cva(
  "p-badge relative min-w-5 shrink-0 justify-center gap-1 outline-none focus-visible:outline-2 focus-visible:outline-(--border-focus) [&_svg:not([class*='size-'])]:size-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [button&,a&]:cursor-pointer",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "",
        lg: "p-badge--large",
        sm: "px-1.5 py-0 text-2xs leading-4",
      },
      variant: {
        default: "p-badge--neutral [button&,a&]:hover:bg-(--bg-fill-transparent-secondary-hover)",
        secondary: "p-badge--neutral [button&,a&]:hover:bg-(--bg-fill-transparent-secondary-hover)",
        neutral: "p-badge--neutral [button&,a&]:hover:bg-(--bg-fill-transparent-secondary-hover)",
        outline: "bg-(--bg-surface) text-(--text-secondary) ring-1 ring-inset ring-(--border) [button&,a&]:hover:bg-(--bg-surface-hover)",
        info: "p-badge--info",
        success: "p-badge--success",
        attention: "p-badge--attention",
        warning: "p-badge--warning",
        critical: "p-badge--critical",
        error: "p-badge--critical",
        destructive: "p-badge--critical",
        magic: "p-badge--magic",
      },
    },
  },
);

interface BadgeProps extends useRender.ComponentProps<"span"> {
  variant?: VariantProps<typeof badgeVariants>["variant"];
  size?: VariantProps<typeof badgeVariants>["size"];
}

export function Badge({
  className,
  variant,
  size,
  render,
  ...props
}: BadgeProps): React.ReactElement {
  const defaultProps = {
    className: cn(badgeVariants({ className, size, variant })),
    "data-slot": "badge",
  };

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(defaultProps, props),
    render,
  });
}
