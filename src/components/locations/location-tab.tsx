"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Download } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IndexTable,
  SkeletonBodyText,
  TextField,
  type BadgeTone,
  type IndexTableHeading,
} from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";
import {
  VEHICLE_LOCATION_LABELS,
  type UUID,
  type VehicleLocation,
  type VehicleStatus,
  type Vendor,
  type User,
} from "@/lib/types";
import { locationService } from "@/lib/services/location-service";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { exportCsv, type ColumnDef } from "@/components/data-grid";
import { LocationBadge } from "./location-badge";

// Status badge tones — kept in step with the Master Sheet / All Vehicles
// grids so a car's status reads identically across inventory.
const STATUS_TONE: Record<VehicleStatus, BadgeTone | undefined> = {
  received: "info",
  inspection_pending: "attention",
  being_prepared: "warning",
  photos_pending: "attention",
  photos_ready: "success",
  ready: "success",
  listed: "info",
  reserved: "warning",
  sold: undefined,
  returned: "critical",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status as VehicleStatus]}>
      {statusLabel(status)}
    </Badge>
  );
}

interface LocationTabProps {
  location: VehicleLocation;
  companyId: UUID;
  vendors: Vendor[];
  users: User[];
  /**
   * Bumped by the parent after every successful move so the tab can
   * re-fetch its rows. Pure state-bump pattern — no callback wiring.
   */
  refreshToken?: number;
  onRequestMove: (vehicleId: UUID) => void;
}

interface TabRow {
  id: UUID;
  registration: string;
  stockId: string;
  make: string;
  model: string;
  status: string;
  currentLocation: VehicleLocation;
  locationSince: string;
  outForTestDrive: boolean;
  testDriveExpectedBackAt: string | null;
  externalVendorId?: UUID | null;
  staffUserId?: UUID | null;
  expectedReturnAt?: string | null;
}

function daysSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.max(0, Math.floor(ms / 86_400_000));
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  const rem = days - weeks * 7;
  return rem === 0 ? `${weeks}w` : `${weeks}w ${rem}d`;
}

/** `inspection_pending` → "Inspection pending" (sentence case). */
function statusLabel(s: string): string {
  const text = s.split("_").join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * One tab pane on `/admin/locations`. Renders the cars currently at this
 * location, with a search box, a Garage/Staff sub-filter set, CSV export,
 * and a Move button per row. The page owns the MoveDialog state and the
 * global vendors/users lookup.
 */
export function LocationTab({
  location,
  companyId,
  vendors,
  users,
  refreshToken = 0,
  onRequestMove,
}: LocationTabProps) {
  const pathname = usePathname();
  const [rows, setRows] = useState<TabRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [filterId, setFilterId] = useState<UUID | null>(null);

  // Pre-index lookups so secondary-line lookups stay O(1).
  const vendorById = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v])),
    [vendors],
  );
  const userById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    locationService
      .getByLocation(companyId, location)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, location, refreshToken]);

  // Filter options for garage / staff tabs — distinct vendor / staff ids in
  // the currently-rendered rows.
  const filterChips = useMemo(() => {
    if (!rows) return [];
    if (location === "garage") {
      const ids = new Set<UUID>();
      for (const r of rows) if (r.externalVendorId) ids.add(r.externalVendorId);
      return [...ids].map((id) => ({ id, label: vendorById[id]?.name ?? "—" }));
    }
    if (location === "staff") {
      const ids = new Set<UUID>();
      for (const r of rows) if (r.staffUserId) ids.add(r.staffUserId);
      return [...ids].map((id) => ({ id, label: userById[id]?.name ?? "—" }));
    }
    return [];
  }, [rows, location, vendorById, userById]);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (location === "garage" && filterId && r.externalVendorId !== filterId)
        return false;
      if (location === "staff" && filterId && r.staffUserId !== filterId)
        return false;
      if (!q) return true;
      return (
        r.registration.toLowerCase().includes(q) ||
        r.stockId.toLowerCase().includes(q) ||
        `${r.make} ${r.model}`.toLowerCase().includes(q)
      );
    });
  }, [rows, query, filterId, location]);

  function handleExport() {
    if (!filteredRows.length) return;
    const cols: ColumnDef<TabRow>[] = [
      { key: "stockId", label: "Stock ID", type: "text", get: (r) => r.stockId },
      { key: "registration", label: "Reg", type: "text", get: (r) => r.registration },
      {
        key: "vehicle",
        label: "Make/Model",
        type: "text",
        get: (r) => `${r.make} ${r.model}`,
      },
      { key: "status", label: "Status", type: "text", get: (r) => statusLabel(r.status) },
      {
        key: "daysHere",
        label: "Days here",
        type: "number",
        get: (r) => daysSince(r.locationSince),
      },
      {
        key: "context",
        label: "Workshop / Staff",
        type: "text",
        get: (r) =>
          r.externalVendorId
            ? (vendorById[r.externalVendorId]?.name ?? "")
            : r.staffUserId
              ? (userById[r.staffUserId]?.name ?? "")
              : "",
      },
    ];
    exportCsv(
      filteredRows,
      cols,
      `locations-${location}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  const locationLabel = VEHICLE_LOCATION_LABELS[location];

  // Garage and Staff rows carry who has the car; Staff also has an
  // expected-back time.
  const headings: IndexTableHeading[] = [
    { title: "Registration" },
    { title: "Vehicle" },
    { title: "Stock ID" },
    ...(location === "garage" ? [{ title: "Workshop" }] : []),
    ...(location === "staff"
      ? [{ title: "Staff member" }, { title: "Expected back" }]
      : []),
    { title: "Status" },
    { title: "Days here", alignment: "end" as const },
    { title: "Actions", alignment: "end" as const },
  ];

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <TextField
            label={`Search ${locationLabel}`}
            labelHidden
            prefix="SearchMinor"
            placeholder={`Search ${locationLabel}…`}
            value={query}
            onChange={setQuery}
            clearButton
            onClearButtonClick={() => setQuery("")}
          />
        </div>

        {/* Garage / Staff sub-filter */}
        {filterChips.length > 0 ? (
          <div
            className="flex flex-wrap items-center gap-1"
            role="group"
            aria-label={location === "garage" ? "Filter by workshop" : "Filter by staff member"}
          >
            <Button
              variant="tertiary"
              pressed={filterId === null}
              onClick={() => setFilterId(null)}
            >
              All
            </Button>
            {filterChips.map((c) => (
              <Button
                key={c.id}
                variant="tertiary"
                pressed={filterId === c.id}
                onClick={() => setFilterId(filterId === c.id ? null : c.id)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="ml-auto">
          <Button
            icon={<Download />}
            onClick={handleExport}
            disabled={filteredRows.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {rows === null ? (
        <Card>
          <SkeletonBodyText lines={6} />
        </Card>
      ) : filteredRows.length === 0 ? (
        <EmptyState heading={`No cars at ${locationLabel}`}>
          {query || filterId
            ? "Try changing the search or filter."
            : `Cars moved to ${locationLabel} show up here.`}
        </EmptyState>
      ) : (
        <IndexTable
          selectable={false}
          primaryColumn={1}
          headings={headings}
          rows={filteredRows.map((r) => {
            const workshop = r.externalVendorId
              ? (vendorById[r.externalVendorId]?.name ?? "Unknown vendor")
              : null;
            const staff = r.staffUserId
              ? (userById[r.staffUserId]?.name ?? "Unknown staff")
              : null;
            const back =
              location === "staff" && r.expectedReturnAt
                ? formatBack(r.expectedReturnAt)
                : null;
            return {
              id: r.id,
              url: vehicleDetailHref(r.id, pathname),
              cells: [
                <RegPlate key="reg" registration={r.registration} size="sm" />,
                `${r.make} ${r.model}`,
                <span key="stock" className="text-(--text-secondary)">
                  {r.stockId}
                </span>,
                ...(location === "garage" ? [workshop ?? "—"] : []),
                ...(location === "staff" ? [staff ?? "—", back ?? "—"] : []),
                <span key="status" className="inline-flex items-center gap-2">
                  {r.outForTestDrive ? (
                    <LocationBadge
                      location={r.currentLocation}
                      outForTestDrive
                      testDriveExpectedBackAt={r.testDriveExpectedBackAt}
                      compact
                    />
                  ) : null}
                  <StatusBadge status={r.status} />
                </span>,
                <span key="days" className="tabular-nums text-(--text-secondary)">
                  {daysSince(r.locationSince)}
                </span>,
                <Button
                  key="move"
                  size="micro"
                  icon="ArrowRightMinor"
                  onClick={() => onRequestMove(r.id)}
                >
                  Move
                </Button>,
              ],
            };
          })}
        />
      )}

      {rows !== null ? (
        <p className="body-sm text-(--text-secondary)">
          {filteredRows.length} of {rows.length} car
          {rows.length === 1 ? "" : "s"} at {locationLabel}
          {query || filterId ? " (filtered)" : ""}
        </p>
      ) : null}
    </>
  );
}

/** Expected-back timestamp for the staff column ("21 Jun, 14:30"). */
function formatBack(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
