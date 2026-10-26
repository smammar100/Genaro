import type { LucideIcon } from "lucide-react";
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
 * Turns SIDEBAR_GROUPS (the one nav source) into the sidebar's rows.
 * Pure, so the rules below are unit-tested (nav.test.tsx) apart from the shell.
 */

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
  /**
   * The section the user opened by clicking its row (null: they closed it).
   * Undefined until they click one, so the current route's section is open.
   */
  openGroup?: string | null;
  /** Counts by item href (see nav-badges). */
  badges?: Readonly<Record<string, string | undefined>>;
}

/**
 * The one labelled group shown open: the tour's, else the one the user
 * clicked open, else the current route's.
 */
export function expandedNavGroup(
  groups: SidebarGroup[],
  { pathname, tourGroup, openGroup }: Pick<NavState, "pathname" | "tourGroup" | "openGroup">,
): SidebarGroup | null {
  if (tourGroup) return groups.find((g) => g.label === tourGroup) ?? null;
  if (openGroup !== undefined) return groups.find((g) => g.label === openGroup) ?? null;
  const activeHref = activeHrefForPath(pathname);
  return (
    groups.find(
      (g) => g.label !== null && g.items.some((item) => item.href === activeHref),
    ) ?? null
  );
}

/** A page link in the nav: a row of its own, or a sub-item of a section. */
export interface NavLink {
  /** The page's tour anchor (navTourId), set on its link. */
  id: string;
  label: string;
  href: string;
  selected: boolean;
  badge?: string;
}

/** A top-level nav row. A section with several pages carries them as `pages`. */
export interface NavRow {
  /** Tour anchor; a section row has none (its pages carry theirs). */
  id?: string;
  label: string;
  icon: LucideIcon;
  href: string;
  /** The current page, or for a section, the open one. */
  selected: boolean;
  badge?: string;
  /** A section's pages, shown as sub-items while it is the open section. */
  pages?: NavLink[];
  /** The first row of a new section (home, lifecycle, admin): spaced from the rows above. */
  newSection?: boolean;
}

/**
 * One row per section, Shopify-admin style: Dashboard, then each group as a
 * row that opens to show its pages as sub-items (it does not navigate itself:
 * the user picks the page). Exactly one page is current — the longest
 * matching href (GEN-36). Every page's link carries its tour anchor
 * (navTourId).
 */
export function navRows(groups: SidebarGroup[], state: NavState): NavRow[] {
  const activeHref = activeHrefForPath(state.pathname);
  const open = expandedNavGroup(groups, state)?.label ?? null;
  const badge = (href: string) => state.badges?.[href] || undefined;
  const page = (item: SidebarItem, label = item.label): NavLink => ({
    id: navTourId(item.href),
    label,
    href: item.href,
    selected: item.href === activeHref,
    badge: badge(item.href),
  });

  const rowsFor = (group: SidebarGroup): NavRow[] => {
    if (group.label === null) {
      return group.items.map((item) => ({ ...page(item), icon: item.icon }));
    }
    const icon = group.icon ?? group.items[0].icon;
    // A single-page section is just that page: the row is its link and anchor.
    if (group.items.length === 1) {
      return [{ ...page(group.items[0], group.label), icon }];
    }
    return [
      {
        label: group.label,
        icon,
        href: group.items[0].href,
        // A section row is "selected" while it is the open one. It toggles
        // rather than links, so its href is only a key.
        selected: group.label === open,
        pages: group.items.map((item) => page(item)),
      },
    ];
  };

  // Flag the first row of each section after the first, among the groups
  // this user can see, so the gap follows whichever group leads it.
  let previous: string | null = null;
  return groups.flatMap((group) => {
    const rows = rowsFor(group);
    const section = group.section ?? "lifecycle";
    if (rows.length > 0 && previous !== null && section !== previous) {
      rows[0] = { ...rows[0], newSection: true };
    }
    if (rows.length > 0) previous = section;
    return rows;
  });
}

