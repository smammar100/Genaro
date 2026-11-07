"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { motion } from "framer-motion";
import * as React from "react";
import { useSquish } from "@/components/genaro/internal/useSquish";
import { cn, hitTarget } from "@/lib/utils";

/**
 * The old-layer switch, wearing Genaro's squish thumb (2026-11-07): the thumb
 * springs across, lengthens with its speed and swells a touch on hover, like
 * the Genaro Switch. base-ui still owns the role, keyboard and form value.
 */
export function Switch({
  className,
  onCheckedChange,
  onPointerEnter,
  onPointerLeave,
  ...props
}: SwitchPrimitive.Root.Props): React.ReactElement {
  const controlled = props.checked !== undefined;
  const [inner, setInner] = React.useState(!!props.defaultChecked);
  const on = controlled ? !!props.checked : inner;

  const rootRef = React.useRef<HTMLButtonElement>(null);
  const thumbRef = React.useRef<HTMLSpanElement>(null);
  // The root's 1px padding either side, less the thumb.
  const travel = () => {
    const root = rootRef.current;
    const thumb = thumbRef.current;
    return root && thumb ? root.clientWidth - 2 - thumb.offsetWidth : 0;
  };
  const { x, scaleX, scaleY, swell } = useSquish(on, travel);

  return (
    <SwitchPrimitive.Root
      ref={rootRef}
      className={cn(
        hitTarget,
        "relative inline-flex h-[calc(var(--thumb-size)+2px)] w-[calc(var(--thumb-size)*2-2px)] shrink-0 items-center rounded-full p-px outline-none transition-[background-color,box-shadow] duration-300 [--thumb-size:--spacing(5)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus) data-disabled:cursor-not-allowed data-checked:bg-(--bg-fill-brand) data-unchecked:bg-(--bg-fill-tertiary-active) data-disabled:opacity-50 sm:[--thumb-size:--spacing(4)]",
        className,
      )}
      data-slot="switch"
      onCheckedChange={(checked, details) => {
        if (!controlled) setInner(checked);
        onCheckedChange?.(checked, details);
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && !props.disabled) swell(true);
        onPointerEnter?.(e);
      }}
      onPointerLeave={(e) => {
        swell(false);
        onPointerLeave?.(e);
      }}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block aspect-square h-full rounded-full bg-(--bg-surface) shadow-(--shadow-200) will-change-transform"
        data-slot="switch-thumb"
        render={<motion.span ref={thumbRef} style={{ x, scaleX, scaleY }} />}
      />
    </SwitchPrimitive.Root>
  );
}
