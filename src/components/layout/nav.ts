import { createElement } from "react";
import { Settings } from "lucide-react";
import type { NavigationItem } from "@/components/polaris";
import type { Capability } from "@/lib/capabilities";
import {
  SIDEBAR_GROUPS,
  MVP_HIDDEN_HREFS,
  activeHrefForPath,
  navTourId,
  type SidebarGroup,
  type SidebarItem,
} from "./sidebar-config";

/**
 * Turns SIDEBAR_GROUPS (the one nav source) into Polaris Navigation items.
 * Pure, so the rules below are unit-tested (nav.test.tsx) apart from the shell.
 */

export const SETTINGS_HREF = "/admin/settings";

/**
 * The groups this user may see. MVP-hidden routes go first, so a super-user
 * (who passes every capability check) does not see them either; then an item
 * shows for super-users, items with no gate, or when the user holds ANY of its
 * capabilities. A group with nothing left is dropped.
 */
export function visibleNavGroups(
  can: (capability: Capability) => boolean,
  isSuperUser: boolean,
): SidebarGroup[] {
  const itemVisible = (item: SidebarItem) =>
    !MVP_HIDDEN_HREFS.has(item.href) &&
    (isSuperUser || !item.requiredAnyOf || item.requiredAnyOf.some(can));
  return SIDEBAR_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(itemVisible),
  })).filter((group) => group.items.length > 0);
}

/** The labelled group holding a route, e.g. the one a tour step points into. */
export function navGroupForHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const group = SIDEBAR_GROUPS.find(
    (g) => g.label !== null && g.items.some((item) => item.href === href),
  );
  return group?.label ?? null;
}

export interface NavState {
  pathname: string;
  /**
   * The group the running tour points into, or null. While set, it is the one
   * group shown open: the tour can only spotlight a row that is rendered, and
   * one open group keeps the nav short enough never to scroll under the
   * spotlight.
   */
  tourGroup: string | null;
  /** Counts by item href (see nav-badges). */
  badges?: Readonly<Record<string, string | undefined>>;
}

/** The one labelled group shown open: the tour's, else the current route's. */
export function expandedNavGroup(
  groups: SidebarGroup[],
  { pathname, tourGroup }: Pick<NavState, "pathname" | "tourGroup">,
): SidebarGroup | null {
  if (tourGroup) return groups.find((g) => g.label === tourGroup) ?? null;
  const activeHref = activeHrefForPath(pathname);
  return (
    groups.find(
      (g) => g.label !== null && g.items.some((item) => item.href === activeHref),
    ) ?? null
  );
}

/**
 * One row per section, Shopify-admin style: Dashboard, then each group as a
 * row linking to its first page, its pages shown as sub-items while it is the
 * open group. Exactly one page is current — the longest matching href
 * (GEN-36). Every page's link carries its tour anchor (navTourId).
 */
export function navItems(groups: SidebarGroup[], state: NavState): NavigationItem[] {
  const activeHref = activeHrefForPath(state.pathname);
  const open = expandedNavGroup(groups, state)?.label ?? null;
  const badge = (href: string) => state.badges?.[href] || undefined;

  return groups.flatMap((group): NavigationItem[] => {
    if (group.label === null) {
      return group.items.map((item) => ({
        id: navTourId(item.href),
        label: item.label,
        icon: createElement(item.icon),
        url: item.href,
        selected: item.href === activeHref,
        badge: badge(item.href),
      }));
    }
    const icon = createElement(group.icon ?? group.items[0].icon);
    // A single-page section is just that page: the row is its link and anchor.
    if (group.items.length === 1) {
      const [only] = group.items;
      return [
        {
          id: navTourId(only.href),
          label: group.label,
          icon,
          url: only.href,
          selected: only.href === activeHref,
          badge: badge(only.href),
        },
      ];
    }
    return [
      {
        label: group.label,
        icon,
        url: group.items[0].href,
        // Polaris shows sub-items only under the selected row, so the open
        // group is the selected one.
        selected: group.label === open,
        subNavigationItems: group.items.map((item) => ({
          id: navTourId(item.href),
          label: item.label,
          url: item.href,
          selected: item.href === activeHref,
          badge: badge(item.href),
        })),
      },
    ];
  });
}

/** Settings, pinned to the foot of the nav. Open to every signed-in user. */
export function settingsNavItem(pathname: string): NavigationItem {
  return {
    id: navTourId(SETTINGS_HREF),
    label: "Settings",
    icon: createElement(Settings),
    url: SETTINGS_HREF,
    selected: pathname === SETTINGS_HREF || pathname.startsWith(`${SETTINGS_HREF}/`),
  };
}
