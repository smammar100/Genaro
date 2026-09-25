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

  const open = expandedNavGroup(groups, { pathname, tourGroup });
  const badges = useNavBadgeCounts(
    navigation && Boolean(open?.items.some((item) => NAV_BADGE_HREFS.has(item.href))),
  );

  return (
    <AdminShell
      navigation={
        navigation ? (
          <AdminNavigation groups={groups} pathname={pathname} tourGroup={tourGroup} badges={badges} />
        ) : undefined
      }
    >
      {children}
    </AdminShell>
  );
}
