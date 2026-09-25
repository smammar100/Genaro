"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@/lib/utils";
import type React from "react";

type CardSize = "sm" | "md" | "lg";

const CARD_SIZE_CLASS: Record<CardSize, string> = {
  sm: "p-3 gap-2",
  md: "",
  lg: "p-5 gap-4",
};

export function Card({
  className,
  size,
  render,
  ...props
}: useRender.ComponentProps<"div"> & {
  size?: CardSize;
}): React.ReactElement {
  const defaultProps = {
    className: cn(
      // Shopify admin card: 12px radius, #ddd hairline, faint bottom shadow.
      "relative flex flex-col rounded-xl border border-border bg-card text-card-foreground text-[13px] shadow-[0_1px_0_rgba(0,0,0,0.05)]",
      size && CARD_SIZE_CLASS[size],
      className,
    ),
    "data-slot": "card",
    "data-size": size,
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props),
    render,
  });
}

export function CardHeader({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">): React.ReactElement {
  const defaultProps = {
    className: cn(
      "grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-4 py-3 in-[[data-slot=card]:has(>[data-slot=card-panel])]:pb-2 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
      className,
    ),
    "data-slot": "card-header",
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props),
    render,
  });
}

export function CardTitle({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">): React.ReactElement {
  const defaultProps = {
    className: cn("font-semibold text-sm text-balance leading-5 text-foreground", className),
    "data-slot": "card-title",
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props),
    render,
  });
}

export function CardDescription({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">): React.ReactElement {
  const defaultProps = {
    className: cn("text-muted-foreground text-[13px] leading-5 text-pretty", className),
    "data-slot": "card-description",
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props),
    render,
  });
}

function CardPanel({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">): React.ReactElement {
  const defaultProps = {
    className: cn(
      "flex-1 px-4 py-3 in-[[data-slot=card]:has(>[data-slot=card-header]:not(.border-b))]:pt-0 in-[[data-slot=card]:has(>[data-slot=card-footer]:not(.border-t))]:pb-0",
      className,
    ),
    "data-slot": "card-panel",
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props),
    render,
  });
}

export { CardPanel as CardContent };
