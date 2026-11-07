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
      // Genaro Card: bg-surface, radius-300 and the bevelled shadow-100,
      // whose inset edges are the card's outline (no border). As in
      // Genaro's ShadowBevel, the bevel is drawn on an overlay so a flush
      // child with its own background (a table header) cannot hide the
      // edges; `shadow-none` on a call site still removes it.
      "relative flex flex-col rounded-(--radius-300) bg-(--bg-surface) text-(--text) text-body after:pointer-events-none after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] after:shadow-(--shadow-100) [&.shadow-none]:after:hidden",
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
