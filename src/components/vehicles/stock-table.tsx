"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Card,
  EmptyState,
  IndexTable,
  SkeletonBodyText,
  TextField,
  type IndexTableHeading,
  type SortDirection,
} from "@/components/polaris";
import { useAuth } from "@/contexts/auth-context";
import { vehicleService } from "@/lib/services/vehicle-service";
import {
  VEHICLE_LOCATIONS,
  VEHICLE_LOCATION_LABELS,
  type Vehicle,
  type VehicleLocation,
} from "@/lib/types";
import { byNewest, byText, isInStock } from "@/lib/stock";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { capitalizeWords, formatDate, titleCase } from "@/lib/utils";
import { RegPlate } from "@/components/shared/reg-plate";
import { VehicleStatusBadge } from "@/components/shared/status-badge";
import { LocationBadge } from "@/components/locations/location-badge";

/** Location views: every car in stock, then one per place a car can be. */
const VIEWS: { label: string; location: VehicleLocation | null }[] = [
  { label: "All", location: null },
  ...VEHICLE_LOCATIONS.map((l) => ({ label: VEHICLE_LOCATION_LABELS[l], location: l })),
];

/**
 * Columns in order. `compare` sorts ascending; the table flips it for a
 * descending sort. Arrived is the default, newest first.
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
      byText(VEHICLE_LOCATION_LABELS[a.currentLocation], VEHICLE_LOCATION_LABELS[b.currentLocation]),
  },
  { title: "Arrived", compare: (a, b) => byNewest(b, a) },
  { title: "Days in stock", alignment: "end", compare: (a, b) => a.daysInStock - b.daysInStock },
];

const ARRIVED = COLUMNS.findIndex((c) => c.title === "Arrived");

const HEADINGS: IndexTableHeading[] = COLUMNS.map(({ title, alignment, compare }) => ({
  title,
  alignment,
  sortable: Boolean(compare),
}));

/**
 * The cars still for sale, as a plain table: no photos, one row per car,
 * sortable by arrival, make, model, location and days in stock (call
 * 2026-10-24, modelled on Click Dealer's advert work list). Sold cars and
 * cars returned to their owner are left out; cars still in prep stay in.
 */
export function StockTable() {
  const { company } = useAuth();
  const pathname = usePathname();
  const [vehicles, setVehicles] = React.useState<Vehicle[] | null>(null);
  const [view, setView] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<{ index: number; direction: SortDirection }>({
    index: ARRIVED,
    direction: "descending",
  });

  React.useEffect(() => {
    if (!company?.id) return;
    let active = true;
    void vehicleService.getAll(company.id).then((list) => {
      if (active) setVehicles(list.filter(isInStock));
    });
    return () => {
      active = false;
    };
  }, [company?.id]);

  const rows = React.useMemo(() => {
    if (!vehicles) return null;
    const location = VIEWS[view].location;
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
  }, [vehicles, view, query, sort]);

  const counts = VIEWS.map((vw) =>
    vehicles
      ? vehicles.filter((v) => !vw.location || v.currentLocation === vw.location).length
      : null,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full sm:w-80">
        <TextField
          label="Search stock"
          labelHidden
          type="search"
          prefix="SearchMinor"
          placeholder="Search by reg, stock ID, make or model"
          value={query}
          onChange={setQuery}
          clearButton
          onClearButtonClick={() => setQuery("")}
        />
      </div>

      {rows === null ? (
        <Card>
          <SkeletonBodyText lines={6} />
        </Card>
      ) : (
        <IndexTable
          selectable={false}
          tabs={VIEWS.map((vw, i) => ({
            id: vw.label,
            content: vw.label,
            badge: counts[i] === null ? undefined : String(counts[i]),
          }))}
          selectedTab={view}
          onSelectTab={setView}
          headings={HEADINGS}
          sortColumnIndex={sort.index}
          sortDirection={sort.direction}
          onSort={(index, direction) => setSort({ index, direction })}
          rows={rows.map((v) => ({
            id: v.id,
            url: vehicleDetailHref(v.id, pathname),
            cells: [
              <RegPlate key="reg" registration={v.registration} size="sm" />,
              titleCase(v.make),
              titleCase(v.model),
              capitalizeWords(v.fuelType) ?? "—",
              <VehicleStatusBadge key="status" status={v.status} />,
              <LocationBadge
                key="location"
                location={v.currentLocation}
                outForTestDrive={v.outForTestDrive}
                testDriveExpectedBackAt={v.testDriveExpectedBackAt}
                compact
              />,
              formatDate(v.receivedDate),
              <span key="days" className="tabular-nums">
                {v.daysInStock}
              </span>,
            ],
          }))}
        />
      )}

      {rows !== null && rows.length === 0 ? (
        <EmptyState icon="SearchMinor" heading="No cars found">
          {query ? "Try a different search or location." : "No cars in stock at this location."}
        </EmptyState>
      ) : null}

      {rows !== null && vehicles ? (
        <p className="body-sm text-(--text-secondary)">
          {rows.length} of {vehicles.length} car{vehicles.length === 1 ? "" : "s"} in stock
        </p>
      ) : null}
    </div>
  );
}
