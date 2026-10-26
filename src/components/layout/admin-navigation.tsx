"use client";

import type * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/genaro";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/fluid/sidebar";
import { SizeProvider } from "@/components/fluid/lib/size-context";
import { cn } from "@/lib/utils";
import type { SidebarGroup as NavGroup } from "./sidebar-config";
import { navRows, type NavRow, type NavState } from "./nav";

/**
 * The admin sidebar, built on Fluid Functionalism's Sidebar: one hover
 * highlight that glides between rows, labels that get heavier without
 * shifting, an edge you can drag to resize or collapse (or press "["), and a
 * drawer below 1024px. Colours are Genaro's nav colours. The rows come from
 * nav.ts: every section the user may see, the open one showing its pages,
 * an Add vehicle button above them. Clicking a section opens it rather than
 * navigating.
 * `id="tour-nav"` is the onboarding tour's anchor for the whole nav; each
 * page's link carries its own (navTourId).
 */
export function AdminNavigation({
  groups,
  onToggleGroup,
  canAddVehicle = false,
  ...state
}: NavState & {
  /** From visibleNavGroups: already filtered to what this user may see. */
  groups: NavGroup[];
  /** Shows the Add vehicle button at the top (the `inventory:add` capability). */
  canAddVehicle?: boolean;
  /** A section row was clicked: open it, or close it if it is the open one. */
  onToggleGroup: (group: string) => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const rows = navRows(groups, state);

  // The library renders these regions twice (the docked rail, and the drawer
  // below 1024px), so the skin and the drawer's close-on-pick live on them
  // rather than on <Sidebar>, whose own props reach the docked rail only.
  const region = {
    className: NAV_SKIN,
    // In the drawer, choosing a page closes it, as the Genaro nav did.
    onClick: (e: React.MouseEvent) => {
      if (isMobile && (e.target as HTMLElement).closest("a")) setOpenMobile(false);
    },
  };

  return (
    // Default density: 32px rows (see NAV_SKIN for the rest of the spacing).
    <SizeProvider size="default">
      <Sidebar id="tour-nav" bordered={false} className="h-full bg-(--nav-bg)">
        <SidebarContent {...region}>
          {canAddVehicle ? (
            // Adding a car is the most frequent job in the app, so it heads the
            // rail as a button rather than sitting among Inventory's pages.
            <div className="px-3 pt-3">
              <Button
                variant="primary"
                fullWidth
                icon={<Plus className="size-4" />}
                url="/inventory/add-vehicle"
                id="tour-nav-add-vehicle"
              >
                Add vehicle
              </Button>
            </div>
          ) : null}
          <SidebarGroup className="p-3">
            <SidebarMenu>
              {rows.map((row) => (
                <Row key={row.href} row={row} onToggle={() => onToggleGroup(row.label)} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        {/* No footer: Settings is in the account menu, and the top bar's menu
            button (or "[") hides and shows the rail. */}
      </Sidebar>
    </SizeProvider>
  );
}

/**
 * Shopify's nav on Fluid Functionalism's behaviour: the library's hover,
 * selected and label tokens pointed at Genaro's nav colours, the selected
 * row given Genaro's bevel, rows at Genaro's 13px.
 *
 * Spacing follows one set of measures (25 Oct 2026): 12px around the rail
 * (the group and footer's p-3), 8px inside a row before its icon (the
 * library's pl-2), 18px icons, 10px from icon to label, 32px rows (sub-rows
 * too), and 20px between sections (Row's mt-5). A sub-menu's rule sits under
 * the parent's icon and its labels line up with the parent's label at
 * 8 + 18 + 10 = 36px: ml 17 + 1px rule + pl 10 + the sub-row's own pl 8.
 */
const NAV_SKIN = cn(
  "[--hover:var(--nav-bg-surface-hover)] [--active:var(--bg-surface)] [--muted-foreground:var(--text)]",
  "[&_.bg-active]:shadow-(--shadow-100)",
  "[&_[data-sidebar=menu-sub]]:[--muted-foreground:var(--text-secondary)]",
  "[&_[data-sidebar=menu-button]]:text-body [&_[data-sidebar=menu-sub-button]]:text-body",
  "[&_[data-sidebar=menu-button]]:gap-2.5 [&_[data-sidebar=menu-button]_svg]:size-[18px]",
  "[&_[data-sidebar=menu-sub-button]]:h-8",
  "[&_[data-sidebar=menu-sub]]:ml-[17px] [&_[data-sidebar=menu-sub]]:pl-2.5",
);

function Row({ row, onToggle }: { row: NavRow; onToggle?: () => void }) {
  return (
    <SidebarMenuItem className={row.newSection ? "mt-5" : undefined}>
      {row.pages ? (
        // A section opens to its pages; it is only "open", the highlight
        // belongs to its page.
        <SidebarMenuButton icon={row.icon} aria-expanded={row.selected} onClick={onToggle}>
          {row.label}
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton icon={row.icon} isActive={row.selected} render={<Link href={row.href} id={row.id} />}>
          {row.label}
        </SidebarMenuButton>
      )}
      {row.badge ? <SidebarMenuBadge>{row.badge}</SidebarMenuBadge> : null}
      {row.pages ? (
        // Inert while closed, so its links drop out of the tab order too.
        <SidebarMenuSub open={row.selected} inert={!row.selected}>
          {row.pages.map((page) => (
            <SidebarMenuSubItem key={page.href}>
              <SidebarMenuSubButton isActive={page.selected} render={<Link href={page.href} id={page.id} />}>
                {page.label}
                {page.badge ? (
                  <span className="body-xs ml-auto tabular-nums text-(--text-secondary)">{page.badge}</span>
                ) : null}
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  );
}
