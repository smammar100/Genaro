"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  IndexTable,
  SkeletonBodyText,
  Tabs,
  TextField,
  type IndexTableHeading,
  type SortDirection,
} from "@/components/genaro";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { vehicleService } from "@/lib/services/vehicle-service";
import { vendorService } from "@/lib/services/vendor-service";
import { teamService } from "@/lib/services/team-service";
import {
  VEHICLE_LOCATIONS,
  VEHICLE_LOCATION_LABELS,
  type User,
  type Vehicle,
  type VehicleLocation,
  type Vendor,
} from "@/lib/types";
import { byNewest, byText, isInStock } from "@/lib/stock";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { capitalizeWords, cn, formatDate, titleCase } from "@/lib/utils";
import { RegPlate } from "@/components/shared/reg-plate";
import { VehicleStatusBadge } from "@/components/shared/status-badge";
import { LocationBadge } from "@/components/locations/location-badge";
import { MoveDialog } from "@/components/locations/move-dialog";
import { useCompanyLocations } from "@/hooks/use-company-locations";
import { liveLocations, locationLabel } from "@/lib/locations";

/** Location views: every active car, then one per place a car can be. */
const BUILT_IN_VIEWS: { label: string; location: VehicleLocation | null }[] = [
  { label: "All", location: null },
  ...VEHICLE_LOCATIONS.map((l) => ({ label: VEHICLE_LOCATION_LABELS[l], location: l })),
];

/**
 * Table columns in order. `compare` sorts ascending; a descending sort flips
 * it. Arrived is the default, newest first.
 */
const COLUMNS: {
  title: string;
  alignment?: "end";
  compare?: (a: Vehicle, b: Vehicle) => number;
}[] = [
  { title: "Registration" },
  { title: "Make", compare: (a, b) => byText(a.make, b.make) || byText(a.model, b.model) },
  { title: "Model", compare: (a, b) => byText(a.model, b.model) || byText(a.make, b.make) },
  { title: "Fuel" },
  { title: "Status" },
  {
    title: "Location",
    compare: (a, b) =>
      byText(locationLabel(a.currentLocation), locationLabel(b.currentLocation)),
  },
  // Refreshed weekly from DVSA (call 2026-10-31); a car with none sorts last.
  {
    title: "MOT expiry",
    compare: (a, b) => (a.motExpiry ?? "9999").localeCompare(b.motExpiry ?? "9999"),
  },
  { title: "Arrived", compare: (a, b) => byNewest(b, a) },
  { title: "Days in stock", compare: (a, b) => a.daysInStock - b.daysInStock },
];

const column = (title: string) => COLUMNS.findIndex((c) => c.title === title);

const HEADINGS: IndexTableHeading[] = COLUMNS.map(({ title, alignment, compare }) => ({
  title,
  alignment,
  sortable: Boolean(compare),
}));

interface Sort {
  index: number;
  direction: SortDirection;
}


const PAGE_SIZE = 50;

/** The location tab in the URL, so old Locations links land on theirs. */
const TAB_PARAM = "tab";

/**
 * All vehicles: the cars still in the business — not sold, not returned to
 * their owner, prep included (call 2026-10-24). Sold and returned cars live
 * on the master sheet. One table (after Click Dealer's advert work list) with
 * a tab per location, search, sorting headings and a Move button on each row:
 * it replaced the separate Locations page and the card view (call 2026-10-31).
 */
export function VehicleIndex({ onAddVehicle }: { onAddVehicle: () => void }) {
  const { company, user } = useAuth();
  const { can, isSuperUser } = usePermissions();
  const canMove = isSuperUser || can("locations:move");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = React.useState<Vehicle[] | null>(null);
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [moving, setMoving] = React.useState<Vehicle | null>(null);
  // One tab per place, the company's own after the built-in ones.
  const custom = useCompanyLocations();
  const VIEWS = [
    ...BUILT_IN_VIEWS,
    ...liveLocations(custom).map((l) => ({ label: l.label, location: l.slug as VehicleLocation | null })),
  ];
  const [tabParam] = React.useState(() => searchParams.get(TAB_PARAM));
  const [picked, setView] = React.useState<number | null>(null);
  // Until a tab is clicked, the URL's (an old Locations link) picks it, once
  // the company's own places have loaded.
  const view = picked ?? Math.max(0, VIEWS.findIndex((vw) => vw.location === tabParam));
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<Sort>({ index: column("Arrived"), direction: "descending" });
  const [page, setPage] = React.useState(0);

  const companyId = company?.id;
  const loadStock = React.useCallback(async () => {
    if (!companyId) return [];
    return (await vehicleService.getAll(companyId)).filter(isInStock);
  }, [companyId]);

  React.useEffect(() => {
    if (!companyId) return;
    let active = true;
    void loadStock().then((list) => {
      if (active) setVehicles(list);
    });
    // What the Move dialog offers: the garages and the staff.
    void Promise.all([vendorService.getAll(companyId), teamService.getAll(companyId)]).then(
      ([v, u]) => {
        if (!active) return;
        setVendors(v);
        setUsers(u);
      },
    );
    return () => {
      active = false;
    };
  }, [companyId, loadStock]);

  const location = VIEWS[view]?.location ?? null;
  // MOTs running out in under 60 days show in red, as on the dashboard.
  const [motSoon] = React.useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 60).toLocaleDateString("en-CA");
  });
  const rows = React.useMemo(() => {
    if (!vehicles) return null;
    const q = query.trim().toLowerCase();
    const compare = COLUMNS[sort.index].compare ?? byNewest;
    const sign = sort.direction === "ascending" ? 1 : -1;
    return vehicles
      .filter(
        (v) =>
          (!location || v.currentLocation === location) &&
          (!q ||
            `${v.registration} ${v.registration.replace(/\s/g, "")} ${v.stockId} ${v.make} ${v.model}`
              .toLowerCase()
              .includes(q)),
      )
      .sort((a, b) => sign * compare(a, b));
  }, [vehicles, location, query, sort]);

  const counts = VIEWS.map((vw) =>
    vehicles
      ? vehicles.filter((v) => !vw.location || v.currentLocation === vw.location).length
      : null,
  );

  const pageCount = rows ? Math.max(1, Math.ceil(rows.length / PAGE_SIZE)) : 1;
  const current = Math.min(page, pageCount - 1);
  const shown = rows?.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE) ?? null;
  const pagination =
    rows && pageCount > 1
      ? {
          hasPrevious: current > 0,
          hasNext: current < pageCount - 1,
          onPrevious: () => setPage(current - 1),
          onNext: () => setPage(current + 1),
          label: `${current * PAGE_SIZE + 1}–${Math.min((current + 1) * PAGE_SIZE, rows.length)} of ${rows.length}`,
        }
      : undefined;

  return (
    <>
      {/* Saved views: their own row under the page header, outside any card. */}
      <Tabs
        tabs={VIEWS.map((vw, i) => ({
          id: vw.label,
          content: vw.label,
          badge: counts[i] === null ? undefined : String(counts[i]),
        }))}
        selected={view}
        onSelect={(i) => {
          setView(i);
          setPage(0);
        }}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-60 flex-1 sm:max-w-sm">
            <TextField
              label="Search vehicles"
              labelHidden
              type="search"
              prefix="SearchMinor"
              placeholder="Search by reg, stock ID, make or model"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(0);
              }}
              clearButton
              onClearButtonClick={() => setQuery("")}
            />
          </div>
        </div>

        {shown === null ? (
          <Card>
            <SkeletonBodyText lines={6} />
          </Card>
        ) : shown.length === 0 ? (
          <Card>
            {vehicles && vehicles.length === 0 ? (
              <EmptyState
                icon="ProductsMinor"
                heading="No vehicles in stock"
                action={{ content: "Add vehicle", onAction: onAddVehicle }}
              >
                Add a vehicle by its registration to start tracking it.
              </EmptyState>
            ) : (
              <EmptyState
                icon="SearchMinor"
                heading="No vehicles found"
                action={{
                  content: "Clear search",
                  onAction: () => {
                    setQuery("");
                    setView(0);
                  },
                }}
              >
                Try a different search or location.
              </EmptyState>
            )}
          </Card>
        ) : (
          <IndexTable
            selectable={false}
            headings={HEADINGS}
            sortColumnIndex={sort.index}
            sortDirection={sort.direction}
            onSort={(index, direction) => {
              setSort({ index, direction });
              setPage(0);
            }}
            pagination={pagination}
            onRowClick={(id) => router.push(vehicleDetailHref(id, pathname))}
            rows={shown.map((v) => ({
              id: v.id,
              url: vehicleDetailHref(v.id, pathname),
              cells: [
                <RegPlate key="reg" registration={v.registration} size="sm" />,
                titleCase(v.make),
                titleCase(v.model),
                capitalizeWords(v.fuelType) ?? "—",
                <VehicleStatusBadge key="status" status={v.status} />,
                // The row's Move button sits beside where the car is (call
                // 2026-11-02), pushed to the cell's edge so the buttons line up
                // down the column whatever the location's name.
                <div key="location" className="flex w-full items-center justify-between gap-2">
                  <LocationBadge
                    location={v.currentLocation}
                    outForTestDrive={v.outForTestDrive}
                    testDriveExpectedBackAt={v.testDriveExpectedBackAt}
                    compact
                  />
                  {canMove ? (
                    <Button
                      size="micro"
                      variant="tertiary"
                      icon={<ArrowRightLeft />}
                      accessibilityLabel={`Move ${v.registration}`}
                      onClick={() => setMoving(v)}
                    >
                      Move
                    </Button>
                  ) : null}
                </div>,
                v.motExpiry ? (
                  <span
                    key="mot"
                    className={cn("tabular-nums", v.motExpiry.slice(0, 10) < motSoon && "text-(--text-critical)")}
                  >
                    {formatDate(v.motExpiry)}
                  </span>
                ) : (
                  "—"
                ),
                formatDate(v.receivedDate),
                <span key="days" className="tabular-nums">
                  {v.daysInStock}
                </span>,
              ],
            }))}
          />
        )}

        {rows !== null && vehicles ? (
          <p className="body-sm text-(--text-secondary)">
            {rows.length} of {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {moving && company && user ? (
        <MoveDialog
          open
          onOpenChange={(open) => {
            if (!open) setMoving(null);
          }}
          vehicle={moving}
          vendors={vendors}
          users={users}
          actorId={user.id}
          companyId={company.id}
          onSuccess={() => void loadStock().then(setVehicles)}
        />
      ) : null}
    </>
  );
}
