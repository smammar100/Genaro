"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
// The tour's state only, not the tour UI (see tour-context).
import { useOnborda } from "@/components/onboarding/tour-context";
import { useGuidedSteps } from "@/hooks/use-guided-steps";
import { usePermissions } from "@/hooks/use-permissions";
import { AdminNavigation } from "./admin-navigation";
import { AdminShell } from "./admin-shell";
import { expandedNavGroup, navGroupForHref, visibleNavGroups } from "./nav";
import { NAV_BADGE_HREFS, useNavBadgeCounts } from "./nav-badges";

/**
 * The App Router shell: AdminShell with the nav derived from the URL, the
 * user's capabilities and the running tour. Must sit inside OnbordaProvider
 * (the dashboard layout's OnboardingTour).
 */
export function NextAdminShell({
  children,
  navigation = true,
}: {
  children?: React.ReactNode;
  /** False for a screen that owns the window (the first-run welcome). */
  navigation?: boolean;
}) {
  const pathname = usePathname();
  const { can, isSuperUser } = usePermissions();
  const groups = React.useMemo(() => visibleNavGroups(can, isSuperUser), [can, isSuperUser]);

  // While the tour runs, the group its step points into is the open one.
  // guidedSteps must be the SAME array the tour steps through, or currentStep
  // resolves to a different step here than on screen (GEN-127).
  const { isOnbordaVisible: tourRunning, currentStep } = useOnborda();
  const guidedSteps = useGuidedSteps();
  const tourGroup = tourRunning ? navGroupForHref(guidedSteps[currentStep]?.awaitRoute) : null;

  // The section the user clicked open, remembered with the route it was
  // clicked on: navigating anywhere drops it, so the new route's section opens.
  const [picked, setPicked] = React.useState<{ pathname: string; group: string | null } | null>(null);
  const openGroup = picked?.pathname === pathname ? picked.group : undefined;

  const open = expandedNavGroup(groups, { pathname, tourGroup, openGroup });
  const badges = useNavBadgeCounts(
    navigation && Boolean(open?.items.some((item) => NAV_BADGE_HREFS.has(item.href))),
  );

  // Clicking the open section closes it; clicking another opens that one.
  const toggleGroup = (group: string) =>
    setPicked({ pathname, group: open?.label === group ? null : group });

  return (
    <AdminShell
      navigation={
        navigation ? (
          <AdminNavigation
            groups={groups}
            canAddVehicle={isSuperUser || can("inventory:add")}
            pathname={pathname}
            tourGroup={tourGroup}
            openGroup={openGroup}
            onToggleGroup={toggleGroup}
            badges={badges}
          />
        ) : undefined
      }
    >
      {children}
    </AdminShell>
  );
}
