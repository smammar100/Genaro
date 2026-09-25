"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";

/**
 * Badge — Polaris Badge: an 8px-radius chip, 12px medium text, in Polaris's
 * tone colours (values from @shopify/polaris-tokens, light theme).
 */
const badgeVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-transparent font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg:not([class*='size-'])]:size-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [button&,a&]:cursor-pointer",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-5 min-w-5 px-2 text-xs leading-4",
        lg: "h-6 min-w-6 px-2.5 text-[13px] leading-5",
        sm: "h-4.5 min-w-4.5 px-1.5 text-[11px] leading-3",
      },
      variant: {
        // Neutral — Polaris's default badge.
        default: "bg-black/[0.06] text-[#303030] [button&,a&]:hover:bg-black/10",
        secondary: "bg-black/[0.06] text-[#303030] [button&,a&]:hover:bg-black/10",
        outline: "border-[#dddddd] bg-white text-[#303030] [button&,a&]:hover:bg-[#f7f7f7]",
        success: "bg-[rgb(175,254,191)] text-[rgb(1,75,64)]",
        warning: "bg-[rgb(255,235,120)] text-[rgb(79,71,0)]",
        error: "bg-[rgb(254,209,215)] text-[rgb(142,11,33)]",
        destructive: "bg-[rgb(254,209,215)] text-[rgb(142,11,33)]",
        info: "bg-[rgb(213,235,255)] text-[rgb(0,58,90)]",
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
