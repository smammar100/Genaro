"use client";

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cn } from "@/lib/utils";
import type React from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const AVATAR_SIZE_CLASS: Record<AvatarSize, string> = {
  xs: "size-5 text-micro",
  sm: "size-6 text-micro",
  md: "size-8 text-caption",
  lg: "size-10 text-body",
  xl: "size-12 text-subtitle",
  "2xl": "size-16 text-subtitle",
};

export function Avatar({
  className,
  size,
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: AvatarSize;
}): React.ReactElement {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-background align-middle",
        size ? AVATAR_SIZE_CLASS[size] : "size-8 text-caption",
        className,
      )}
      data-slot="avatar"
      {...props}
    />
  );
}

export function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props): React.ReactElement {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted",
        className,
      )}
      data-slot="avatar-fallback"
      {...props}
    />
  );
}
