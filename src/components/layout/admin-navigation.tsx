import { Navigation } from "@/components/polaris";
import type { SidebarGroup } from "./sidebar-config";
import { navItems, settingsNavItem, type NavState } from "./nav";

/**
 * The admin sidebar: every section the user may see (filling the height, so
 * Settings sits at the foot). `id="tour-nav"` is the onboarding tour's anchor
 * for the whole nav; each page's link carries its own (navTourId).
 */
export function AdminNavigation({
  groups,
  ...state
}: NavState & {
  /** From visibleNavGroups: already filtered to what this user may see. */
  groups: SidebarGroup[];
}) {
  return (
    <Navigation id="tour-nav">
      <Navigation.Section fill items={navItems(groups, state)} />
      <Navigation.Section items={[settingsNavItem(state.pathname)]} />
    </Navigation>
  );
}
