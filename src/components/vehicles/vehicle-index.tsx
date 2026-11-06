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
  EmptyStateIllustration,
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
 * Table columns in order (Compact, docs/vehicles.md). `compare` sorts ascending; a descending
 * sort flips it. Arrived is the default, newest first, though no column shows it.
 */
const COLUMNS: {
  title: string;
  alignment?: "end";
  media?: boolean;
  compare?: (a: Vehicle, b: Vehicle) => number;
}[] = [
  { title: "Registration" },
  { title: "Vehicle", compare: (a, b) => byText(a.make, b.make) || byText(a.model, b.model) },
  { title: "Fuel" },
  { title: "Status" },
  {
    title: "Location",
    compare: (a, b) => byText(locationLabel(a.currentLocation), locationLabel(b.currentLocation)),
  },
  // Refreshed weekly from DVSA (call 2026-10-31); a car with none sorts last.
  {
    title: "MOT",
    alignment: "end",
    compare: (a, b) => (a.motExpiry ?? "9999").localeCompare(b.motExpiry ?? "9999"),
  },
  { title: "In stock", alignment: "end", compare: (a, b) => a.daysInStock - b.daysInStock },
  // The row's Move button; the heading is for screen readers only.
  { title: "Actions", media: true },
];

const column = (title: string) => COLUMNS.findIndex((c) => c.title === title);

const HEADINGS: IndexTableHeading[] = COLUMNS.map(({ title, alignment, media, compare }) => ({
  title,
  alignment,
  media,
  sortable: Boolean(compare),
}));

/** The default sort: newest arrival first. It is not a column, so no heading shows it. */
const ARRIVED = -1;

interface Sort {
  index: number;
  direction: SortDirection;
}

/** Past this many days in stock a car's count takes the main text colour. */
const AGING_DAYS = 90;

const PAGE_SIZE = 50;

/** The location tab in the URL, so old Locations links land on theirs. */
const TAB_PARAM = "tab";

/**
 * All vehicles: the cars still in the business — not sold, not returned to
 * their owner, prep included (call 2026-10-24). Sold and returned cars live
 * on the master sheet. One dense table (Compact, picked 2026-11-06 from three
 * prototypes, docs/vehicles.md) with a tab per location, search, sorting
 * headings and a Move button at the end of each row.
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
  const [sort, setSort] = React.useState<Sort>({ index: ARRIVED, direction: "descending" });
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
  // Today and the 60-day line, read once: MOTs inside it show in red, as on the dashboard.
  const [dates] = React.useState(() => {
    const d = new Date();
    return {
      today: d.toLocaleDateString("en-CA"),
      soon: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 60).toLocaleDateString("en-CA"),
    };
  });
  const motDue = (v: Vehicle) => Boolean(v.motExpiry && v.motExpiry.slice(0, 10) < dates.soon);

  const rows = React.useMemo(() => {
    if (!vehicles) return null;
    const q = query.trim().toLowerCase();
    const compare = COLUMNS[sort.index]?.compare ?? ((a: Vehicle, b: Vehicle) => byNewest(b, a));
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
              <EmptyState illustration={<EmptyStateIllustration variant="list" plates />}
                heading="No vehicles in stock"
                action={{ content: "Add vehicle", onAction: onAddVehicle }}
              >
                Add a vehicle by its registration to start tracking it.
              </EmptyState>
            ) : (
              <EmptyState illustration={<EmptyStateIllustration variant="search" plates />}
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
            condensed
            selectable={false}
            primaryColumn={column("Vehicle")}
            headings={HEADINGS}
            sortColumnIndex={sort.index === ARRIVED ? undefined : sort.index}
            sortDirection={sort.direction}
            onSort={(index, direction) => {
              setSort({ index, direction });
              setPage(0);
            }}
            pagination={pagination}
            onRowClick={(id) => router.push(vehicleDetailHref(id, pathname))}
            rows={shown.map((v) => {
              const expired = Boolean(v.motExpiry && v.motExpiry.slice(0, 10) < dates.today);
              return {
                id: v.id,
                url: vehicleDetailHref(v.id, pathname),
                cells: [
                  <RegPlate key="reg" registration={v.registration} size="sm" />,
                  // The car, with its year beside it in grey: one line, so the row stays 32px.
                  <span key="car" className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate">{titleCase(`${v.make} ${v.model}`)}</span>
                    {v.year ? <span className="font-normal text-(--text-secondary) tabular-nums">{v.year}</span> : null}
                  </span>,
                  <span key="fuel" className="text-(--text-secondary)">{capitalizeWords(v.fuelType) ?? "—"}</span>,
                  <VehicleStatusBadge key="status" status={v.status} />,
                  <LocationBadge
                    key="location"
                    location={v.currentLocation}
                    outForTestDrive={v.outForTestDrive}
                    testDriveExpectedBackAt={v.testDriveExpectedBackAt}
                    compact
                  />,
                  v.motExpiry ? (
                    <span key="mot" className={cn("tabular-nums", motDue(v) ? "text-(--text-critical)" : "text-(--text-secondary)")}>
                      {expired ? "Expired" : formatDate(v.motExpiry)}
                    </span>
                  ) : (
                    <span key="mot" className="text-(--text-secondary)">—</span>
                  ),
                  // Days in stock, "14d", flush with its heading. Past 90 days it takes
                  // the main text colour, so the cars that have sat longest stand out.
                  <span
                    key="days"
                    className={cn("tabular-nums", v.daysInStock >= AGING_DAYS ? "text-(--text)" : "text-(--text-secondary)")}
                  >
                    {`${v.daysInStock}d`}
                  </span>,
                  canMove ? (
                    <span key="move" className="flex justify-end">
                      <Button
                        size="micro"
                        variant="tertiary"
                        icon={<ArrowRightLeft strokeWidth={1.75} />}
                        accessibilityLabel={`Move ${v.registration}`}
                        onClick={() => setMoving(v)}
                      />
                    </span>
                  ) : null,
                ],
              };
            })}
          />
        )}

        {rows !== null && vehicles ? (
          <p className="body-sm text-(--text-secondary) tabular-nums">
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
