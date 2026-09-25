"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, Settings } from "lucide-react";
import { accountHandle } from "@/lib/auth/username";
import { GlobalSearch, NotificationsMenu, UserMenu } from "./account-menus";
import { HealthIndicator } from "./health-indicator";
// The tour's state only, not the tour UI (see tour-context).
import { useOnborda } from "@/components/onboarding/tour-context";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import {
  SIDEBAR_GROUPS,
  MVP_HIDDEN_HREFS,
  navTourId,
  activeHrefForPath,
  type SidebarGroup,
  type SidebarItem,
} from "./sidebar-config";
import { SIDEBAR_BADGES } from "./sidebar-badges";
import { useGuidedSteps } from "@/hooks/use-guided-steps";

// Shopify admin nav rows, as measured on admin.shopify.com (Sep 2026): 30px
// tall, 12px radius, 13px text at -1% tracking, 82%-white on the dark rail;
// the active row is a 10%-white pill in medium weight. On a coarse pointer the
// row grows to the 44px a finger needs (GEN-93).
const ITEM_BASE =
  "relative flex h-[30px] items-center gap-2 rounded-xl pl-2 pr-1 text-[13px] tracking-[-0.01em] no-underline transition-colors pointer-coarse:h-11 [&_svg]:text-current";
const ITEM_ACTIVE = "bg-white/10 font-medium text-[#f7f7f7]";
const ITEM_INACTIVE = "text-white/80 hover:bg-white/[0.06] hover:text-[#f7f7f7]";
// Sub-rows sit under their section, text aligned with the section's label
// (34px in — measured from the Shopify admin) and without an icon.
const SUB_BASE =
  "relative flex h-[30px] items-center rounded-xl pl-[34px] pr-1 text-[13px] tracking-[-0.01em] no-underline transition-colors pointer-coarse:h-11";

export function AppSidebar({
  open = false,
  onClose,
  onHide,
}: {
  /** Mobile drawer state (the rail is always shown from lg up). */
  open?: boolean;
  onClose?: () => void;
  /** Desktop: hide the rail (the page header offers the way back). */
  onHide?: () => void;
} = {}) {
  const pathname = usePathname();
  const { user, company } = useAuth();
  const { can, isSuperUser } = usePermissions();
  // Safe to read unconditionally: the dashboard layout mounts the sidebar
  // inside OnbordaProvider, so the context is always present.
  const { isOnbordaVisible: tourRunning, currentStep } = useOnborda();
  // Must be the SAME array the tour is stepping through, or currentStep
  // resolves to a different step here than on screen (GEN-127).
  const guidedSteps = useGuidedSteps();

  // The one group the tour needs open right now.
  //
  // Groups are collapsed by default, so the nav item a step points at would
  // not be in the DOM and the user could not click what is not rendered.
  // Opening only the group in question — rather than all of them — is what
  // keeps this correct: every group open makes the rail taller than the
  // viewport, and once it scrolls, Onborda measures the pointer against a
  // position the scroll then moves, landing the spotlight on the wrong row.
  // One group at a time keeps the rail short enough never to scroll.
  const tourGroupLabel: string | null = React.useMemo(() => {
    if (!tourRunning) return null;
    const href = guidedSteps[currentStep]?.awaitRoute;
    if (!href) return null;
    const group = SIDEBAR_GROUPS.find((g) =>
      g.items.some((item) => item.href === href),
    );
    return group?.label ?? null;
  }, [tourRunning, currentStep, guidedSteps]);
  // Collapsed group labels. Default: every group collapsed (GEN-29) so the
  // sidebar loads compact; the group holding the active route is force-expanded
  // at render time. Deterministic on server + first client paint (no persisted
  // read here) so there's no hydration mismatch or active-group expand flicker.
  // Capability gating (unchanged): an item shows for super-users, items with no
  // gate, or items where the user holds ANY required capability. A group renders
  // only if at least one item is visible.
  const visibleGroups: SidebarGroup[] = React.useMemo(() => {
    // Held back from the MVP launch — checked before capabilities so that a
    // super-user (who passes every capability check) does not see them either.
    const itemVisible = (item: SidebarItem) =>
      !MVP_HIDDEN_HREFS.has(item.href) &&
      (isSuperUser || !item.requiredAnyOf || item.requiredAnyOf.some(can));
    return SIDEBAR_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(itemVisible),
    })).filter((group) => group.items.length > 0);
  }, [can, isSuperUser]);

  // Exactly one nav item is active: the single longest href matching the current
  // path. This stops a parent route (/maintenance) from also highlighting when a
  // child route (/maintenance/calendar) is open (GEN-36).
  const activeHref = React.useMemo(() => activeHrefForPath(pathname), [pathname]);
  function isActive(href: string): boolean {
    return href === activeHref;
  }

  // The group containing the current route — always rendered expanded so the
  // active page stays visible even when the user's default is collapsed.
  const activeGroupLabel: string | null = React.useMemo(() => {
    const group = visibleGroups.find(
      (g) => g.label !== null && g.items.some((item) => isActive(item.href)),
    );
    return group?.label ?? null;
    // isActive is a pure function of pathname, so pathname is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleGroups, pathname]);

  /** A top-level row: icon + label (Dashboard, and each section). */
  const row = (opts: {
    key: string;
    href: string;
    label: string;
    Icon: SidebarItem["icon"];
    active: boolean;
    id?: string;
    badge?: React.ReactNode;
  }) => (
    <li key={opts.key} className="shrink-0">
      <Link
        id={opts.id}
        href={opts.href}
        aria-current={opts.active ? "page" : undefined}
        className={cn(ITEM_BASE, opts.active ? ITEM_ACTIVE : ITEM_INACTIVE)}
      >
        <opts.Icon className="size-4 shrink-0" />
        <span className="flex-1 truncate">{opts.label}</span>
        {opts.badge}
      </Link>
    </li>
  );

  /** A section's pages, shown indented under it while you are inside it. */
  const subRows = (items: SidebarItem[]) =>
    items.map((item) => {
      const on = isActive(item.href);
      const Badge = SIDEBAR_BADGES[item.href];
      return (
        <li key={item.href} className="shrink-0">
          <Link
            id={navTourId(item.href)}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              SUB_BASE,
              on ? "bg-white/10 font-medium text-[#f7f7f7]" : "text-[#a6a6a6] hover:bg-white/[0.06] hover:text-[#f7f7f7]",
            )}
          >
            <span className="flex-1 truncate">{item.label}</span>
            {Badge ? <Badge /> : null}
          </Link>
        </li>
      );
    });

  return (
    <>
    {/* Mobile: the rail is a drawer over a scrim; from lg up it is docked. */}
    {open && (
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
      />
    )}
    <aside
      data-app-rail=""
      aria-label="Main navigation"
      onClick={(e) => {
        // Following a link closes the mobile drawer.
        if ((e.target as HTMLElement).closest("a")) onClose?.();
      }}
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-1 pl-4 pr-2 pt-3">
        <Link
          id="tour-brand"
          href="/dashboard"
          data-nav-brand=""
          className="flex min-w-0 flex-1 items-center gap-2 no-underline"
        >
          {company?.logoMarkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoMarkUrl}
              alt=""
              className="size-7 shrink-0 rounded-md object-contain"
            />
          ) : (
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-nav-mark text-[11px] font-semibold text-white">
              CC
            </span>
          )}
          <span className="flex min-w-0 flex-col leading-tight">
            <span
              className="truncate text-[13px] font-semibold text-[#f7f7f7]"
              suppressHydrationWarning
            >
              {company?.name ?? "Car Capital UK"}
            </span>
            {/* The signed-in user's email — or their username, never the
                synthetic address behind a username login (GEN-34). */}
            <span
              className="truncate text-[11px] text-[#a6a6a6]"
              suppressHydrationWarning
            >
              {user ? accountHandle(user) || "—" : "—"}
            </span>
          </span>
        </Link>
        {/* Shopify admin's rail toggle. Desktop hides the rail; on a phone the
            rail is a drawer, so the same icon closes it. */}
        <button
          type="button"
          onClick={() => (open ? onClose?.() : onHide?.())}
          aria-label="Hide navigation"
          title="Hide navigation"
          className="grid size-8 shrink-0 place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <PanelLeft className="size-4" />
        </button>
      </div>

      {/* Shopify-admin layout: search heads the rail. */}
      <GlobalSearch className="px-3 pb-2 pt-2" />

      {/* Flat, Shopify-admin style: one row per section; a section's pages
          appear indented beneath it only while you are in it (or while the
          tour points into it — the tour can only spotlight a row that exists,
          and keeping one section open keeps the rail short enough never to
          scroll under the spotlight). */}
      <nav id="tour-nav" className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-1">
        <ul className="flex flex-col">
          {visibleGroups.map((group) => {
            if (group.label === null) {
              return group.items.map((item) =>
                row({
                  key: item.href,
                  id: navTourId(item.href),
                  href: item.href,
                  label: item.label,
                  Icon: item.icon,
                  active: isActive(item.href),
                }),
              );
            }
            const inside = group.label === activeGroupLabel;
            const open = tourRunning ? group.label === tourGroupLabel : inside;
            return (
              <React.Fragment key={group.label}>
                {row({
                  key: `g:${group.label}`,
                  href: group.items[0].href,
                  label: group.label,
                  Icon: group.icon ?? group.items[0].icon,
                  // The section row lights up only when no sub-row can — a
                  // single-page section, or while it is merely the tour target.
                  active: inside && group.items.length === 1,
                })}
                {open && group.items.length > 1 && subRows(group.items)}
              </React.Fragment>
            );
          })}
        </ul>
      </nav>

      {/* Foot of the rail, as in the Shopify admin: Settings, then the
          account with its notifications bell. */}
      <div className="flex flex-col gap-1 px-3 pb-3 pt-2">
        <Link
          href="/admin/settings"
          aria-current={pathname.startsWith("/admin/settings") ? "page" : undefined}
          className={cn(
            ITEM_BASE,
            pathname.startsWith("/admin/settings") ? ITEM_ACTIVE : ITEM_INACTIVE,
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Settings</span>
        </Link>
        <div className="flex min-w-0 items-center justify-between gap-1" data-nav-account="">
          <div className="min-w-0 flex-1">
            <UserMenu align="start" />
          </div>
          <HealthIndicator />
          <NotificationsMenu />
        </div>
      </div>
    </aside>
    </>
  );
}
