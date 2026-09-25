"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  VEHICLE_LOCATIONS,
  VEHICLE_LOCATION_LABELS,
  type UUID,
  type User,
  type Vehicle,
  type VehicleLocation,
  type Vendor,
} from "@/lib/types";
import { locationService } from "@/lib/services/location-service";
import { vendorService } from "@/lib/services/vendor-service";
import { teamService } from "@/lib/services/team-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { Page, Tabs } from "@/components/polaris";
import { LocationTab } from "@/components/locations/location-tab";
import { MoveDialog } from "@/components/locations/move-dialog";

const TAB_PARAM = "tab";

function isValidTab(s: string | null): s is VehicleLocation {
  return s != null && (VEHICLE_LOCATIONS as string[]).includes(s);
}

/**
 * /admin/locations — Module A (Spec v3.0 · Phase 2).
 *
 * 4-tab page (Forecourt / Yard / Garage / Staff) backed by
 * `vehicles.current_location`. Tab state syncs via the URL search-param
 * `?tab=…`. Each tab renders a `LocationTab` table; a row's Move action
 * opens the shared `MoveDialog`. Capability `locations:move` gates the
 * Move action (Super User bypasses via `isSuperUser`).
 */
export default function LocationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get(TAB_PARAM);
  const activeTab: VehicleLocation = isValidTab(tabParam)
    ? tabParam
    : "forecourt";

  const { company, user } = useAuth();
  const { can, isSuperUser } = usePermissions();
  const companyId = company?.id;
  const actorId = user?.id;

  const [counts, setCounts] = useState<Record<VehicleLocation, number> | null>(
    null,
  );
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [moveTarget, setMoveTarget] = useState<Vehicle | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const canMove = isSuperUser || can("locations:move");

  // Load shared lookups + tab counts once per company.
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    Promise.all([
      locationService.getCounts(companyId),
      vendorService.getAll(companyId),
      teamService.getAll(companyId),
    ])
      .then(([c, v, u]) => {
        if (cancelled) return;
        setCounts(c);
        setVendors(v);
        setUsers(u);
      })
      .catch(() => {
        if (!cancelled) {
          setCounts({ forecourt: 0, yard: 0, garage: 0, staff: 0 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, refreshToken]);

  const setTab = useCallback(
    (loc: VehicleLocation) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set(TAB_PARAM, loc);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleRequestMove = useCallback(
    async (vehicleId: UUID) => {
      // Pull the full vehicle so the dialog can show identity + current
      // location accurately (the LocationTab row carries only a slice).
      const v = await vehicleService.getById(vehicleId);
      if (v) setMoveTarget(v);
    },
    [setMoveTarget],
  );

  const handleMoveSuccess = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  const totalActive = useMemo(() => {
    if (!counts) return 0;
    return counts.forecourt + counts.yard + counts.garage + counts.staff;
  }, [counts]);

  if (!companyId || !actorId) {
    return (
      <Page title="Locations">
        <p className="body-md text-(--text-secondary)">Loading session…</p>
      </Page>
    );
  }

  return (
    // Padding comes from the layout's PageShell — pages don't add their own
    // (GEN-61).
    <Page
      title="Locations"
      subtitle="See where every car physically is right now. Each vehicle sits in exactly one location; use the tabs to view each."
      fullWidth
      titleMetadata={
        counts ? (
          <span className="body-sm text-(--text-secondary)">
            {totalActive} total active
          </span>
        ) : null
      }
    >
      {/* Location tabs with a live count badge per tab. */}
      <Tabs
        tabs={VEHICLE_LOCATIONS.map((loc) => ({
          id: loc,
          content: VEHICLE_LOCATION_LABELS[loc],
          badge: counts?.[loc],
        }))}
        selected={Math.max(0, VEHICLE_LOCATIONS.indexOf(activeTab))}
        onSelect={(i) => {
          const loc = VEHICLE_LOCATIONS[i];
          if (loc) setTab(loc);
        }}
      />

      {/* Tab pane */}
      <LocationTab
        location={activeTab}
        companyId={companyId}
        vendors={vendors}
        users={users}
        refreshToken={refreshToken}
        onRequestMove={canMove ? handleRequestMove : () => {}}
      />

      {/* Move dialog */}
      {moveTarget ? (
        <MoveDialog
          open={!!moveTarget}
          onOpenChange={(open) => {
            if (!open) setMoveTarget(null);
          }}
          vehicle={moveTarget}
          vendors={vendors}
          users={users}
          actorId={actorId}
          companyId={companyId}
          onSuccess={handleMoveSuccess}
        />
      ) : null}
    </Page>
  );
}
