"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";
import { resolveRender } from "@/lib/as-child";
import type * as React from "react";

const Menu: typeof MenuPrimitive.Root = MenuPrimitive.Root;

function MenuTrigger({
  className,
  children,
  asChild,
  render,
  ...props
}: MenuPrimitive.Trigger.Props & {
  asChild?: boolean;
}): React.ReactElement {
  const resolved = resolveRender(asChild, children, render);
  return (
    <MenuPrimitive.Trigger
      className={className}
      data-slot="menu-trigger"
      render={resolved.render}
      {...props}
    >
      {resolved.children}
    </MenuPrimitive.Trigger>
  );
}

function MenuPopup({
  children,
  className,
  sideOffset = 4,
  align = "center",
  alignOffset,
  side = "bottom",
  anchor,
  portalProps,
  ...props
}: MenuPrimitive.Popup.Props & {
  align?: MenuPrimitive.Positioner.Props["align"];
  sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
  alignOffset?: MenuPrimitive.Positioner.Props["alignOffset"];
  side?: MenuPrimitive.Positioner.Props["side"];
  anchor?: MenuPrimitive.Positioner.Props["anchor"];
  portalProps?: MenuPrimitive.Portal.Props;
}): React.ReactElement {
  return (
    <MenuPrimitive.Portal {...portalProps}>
      <MenuPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="z-[900]"
        data-slot="menu-positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          className={cn(
            "relative flex not-[class*='w-']:min-w-32 origin-(--transform-origin) rounded-xl bg-popover shadow-[0_4px_8px_-2px_rgba(26,26,26,0.2),0_0_0_1px_rgba(0,0,0,0.08)] outline-none focus:outline-none",
            className,
          )}
          data-slot="menu-popup"
          {...props}
        >
          <div className="max-h-(--available-height) w-full overflow-y-auto p-1.5">
            {children}
          </div>
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function MenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean;
  variant?: "default" | "destructive";
}): React.ReactElement {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex min-h-8 cursor-default select-none items-center gap-2 rounded-lg px-2 py-1 text-[13px] text-foreground outline-none data-disabled:pointer-events-none data-highlighted:bg-[#f1f1f1] data-inset:ps-8 data-[variant=destructive]:text-destructive-foreground data-highlighted:text-accent-foreground data-disabled:opacity-64 [&>svg:not([class*='opacity-'])]:opacity-80 [&>svg:not([class*='size-'])]:size-4.5 sm:[&>svg:not([class*='size-'])]:size-4 [&>svg]:pointer-events-none [&>svg]:-mx-0.5 [&>svg]:shrink-0",
        className,
      )}
      data-inset={inset}
      data-slot="menu-item"
      data-variant={variant}
      {...props}
    />
  );
}

/**
 * A heading inside a menu that is not wrapped in a `MenuGroup`. Base UI's
 * GroupLabel throws outside a Menu.Group, so standalone headings ("Change
 * status") render as a plain, non-interactive label instead.
 */
function MenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<"div"> & {
  inset?: boolean;
}): React.ReactElement {
  return (
    <div
      role="presentation"
      className={cn(
        "px-2 py-1.5 font-medium text-muted-foreground text-xs data-inset:ps-9 sm:data-inset:ps-8",
        className,
      )}
      data-inset={inset}
      data-slot="menu-label"
      {...props}
    />
  );
}

function MenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props): React.ReactElement {
  return (
    <MenuPrimitive.Separator
      className={cn("mx-2 my-1 h-px bg-border", className)}
      data-slot="menu-separator"
      {...props}
    />
  );
}

export {
  Menu as DropdownMenu,
  MenuTrigger as DropdownMenuTrigger,
  MenuPopup as DropdownMenuContent,
  MenuItem as DropdownMenuItem,
  MenuLabel as DropdownMenuLabel,
  MenuSeparator as DropdownMenuSeparator,
};
