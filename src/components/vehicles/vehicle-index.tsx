"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Rows3 } from "lucide-react";
import {
  Button,
  ButtonGroup,
  Card,
  EmptyState,
  IndexTable,
  Pagination,
  Select,
  SkeletonBodyText,
  Tabs,
  TextField,
  type IndexTableHeading,
  type SortDirection,
} from "@/components/genaro";
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
import { variantLabel } from "@/lib/vehicle-variant";
import { PHOTOS_ENABLED } from "@/lib/phase-one";
import { capitalizeWords, formatDate, titleCase } from "@/lib/utils";
import { RegPlate } from "@/components/shared/reg-plate";
import { VehicleStatusBadge } from "@/components/shared/status-badge";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { DaysInStockChip } from "@/components/shared/days-in-stock-chip";
import { LocationBadge } from "@/components/locations/location-badge";

/** Location views: every active car, then one per place a car can be. */
const VIEWS: { label: string; location: VehicleLocation | null }[] = [
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
      byText(VEHICLE_LOCATION_LABELS[a.currentLocation], VEHICLE_LOCATION_LABELS[b.currentLocation]),
  },
  { title: "Arrived", compare: (a, b) => byNewest(b, a) },
  { title: "Days in stock", alignment: "end", compare: (a, b) => a.daysInStock - b.daysInStock },
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

/**
 * The card view's sort menu: the table's sortable columns, both ways, in
 * words. A sort picked from a table heading is always one of these.
 */
const SORTS: { label: string; sort: Sort }[] = [
  { label: "Newest", sort: { index: column("Arrived"), direction: "descending" } },
  { label: "Oldest", sort: { index: column("Arrived"), direction: "ascending" } },
  { label: "Most days in stock", sort: { index: column("Days in stock"), direction: "descending" } },
  { label: "Fewest days in stock", sort: { index: column("Days in stock"), direction: "ascending" } },
  { label: "Make A–Z", sort: { index: column("Make"), direction: "ascending" } },
  { label: "Make Z–A", sort: { index: column("Make"), direction: "descending" } },
  { label: "Model A–Z", sort: { index: column("Model"), direction: "ascending" } },
  { label: "Model Z–A", sort: { index: column("Model"), direction: "descending" } },
  { label: "Location A–Z", sort: { index: column("Location"), direction: "ascending" } },
  { label: "Location Z–A", sort: { index: column("Location"), direction: "descending" } },
];

const sortKey = (s: Sort) => `${s.index}:${s.direction}`;

/** 48 divides evenly into rows of 2, 3 and 4 cards. */
const PAGE_SIZE = 48;

type Mode = "table" | "cards";
/** The viewer's last choice of view, kept in their browser. */
const MODE_KEY = "cc-all-vehicles-view";

/**
 * All vehicles: the cars still in the business — not sold, not returned to
 * their owner, prep included (call 2026-10-24). Sold and returned cars live
 * on the master sheet. Shown as a plain table (after Click Dealer's advert
 * work list) or as cards four to a row, with location tabs, search, and the
 * same sort in either view.
 */
export function VehicleIndex({ onAddVehicle }: { onAddVehicle: () => void }) {
  const { company } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [vehicles, setVehicles] = React.useState<Vehicle[] | null>(null);
  const [view, setView] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<Sort>(SORTS[0].sort);
  const [page, setPage] = React.useState(0);
  const [mode, setMode] = React.useState<Mode>("table");

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

  // Storage can't be read on the server, so the remembered view applies once
  // mounted. Blocked storage just keeps the table.
  React.useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(MODE_KEY) === "cards") setMode("cards");
    } catch {
      /* storage unavailable */
    }
  }, []);

  function changeMode(next: Mode) {
    setMode(next);
    setPage(0);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* storage unavailable: the choice lasts this visit */
    }
  }

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
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {/* The table sorts from its headings; cards need a menu. */}
            {mode === "cards" ? (
              <div className="w-60">
                <Select
                  label="Sort by"
                  labelInline
                  options={SORTS.map((s) => ({ label: s.label, value: sortKey(s.sort) }))}
                  value={sortKey(sort)}
                  onChange={(value) => {
                    const picked = SORTS.find((s) => sortKey(s.sort) === value);
                    if (picked) setSort(picked.sort);
                    setPage(0);
                  }}
                />
              </div>
            ) : null}
            <ButtonGroup variant="segmented">
              <Button
                icon={<LayoutGrid />}
                pressed={mode === "cards"}
                onClick={() => changeMode("cards")}
              >
                Cards
              </Button>
              <Button
                icon={<Rows3 />}
                pressed={mode === "table"}
                onClick={() => changeMode("table")}
              >
                Table
              </Button>
            </ButtonGroup>
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
        ) : mode === "table" ? (
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
        ) : (
          <>
            <div className="@container">
              <div className="grid gap-3 @md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4">
                {shown.map((v) => (
                  <VehicleCard key={v.id} v={v} href={vehicleDetailHref(v.id, pathname)} />
                ))}
              </div>
            </div>
            {pagination ? (
              <div className="flex justify-center py-2">
                <Pagination {...pagination} />
              </div>
            ) : null}
          </>
        )}

        {rows !== null && vehicles ? (
          <p className="body-sm text-(--text-secondary)">
            {rows.length} of {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
    </>
  );
}

/**
 * One car in the card view: the same facts as a table row. A click anywhere on
 * it opens the car, like a row; the title stays a link for keyboards and new
 * tabs.
 */
function VehicleCard({ v, href }: { v: Vehicle; href: string }) {
  const router = useRouter();
  const variant = variantLabel(v, "");
  return (
    <div
      className="group h-full cursor-pointer"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return;
        router.push(href);
      }}
    >
      <Card padding="0" className="h-full overflow-hidden group-hover:bg-(--bg-surface-hover)">
        {PHOTOS_ENABLED ? (
          <Link href={href} tabIndex={-1} aria-hidden className="block">
            <VehicleImage
              vehicle={v}
              variant="card"
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
              className="h-40 w-full rounded-none"
            />
          </Link>
        ) : null}
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <RegPlate registration={v.registration} size="sm" />
            <VehicleStatusBadge status={v.status} />
          </div>
          <div className="min-w-0">
            <Link href={href} className="heading-sm text-(--text) hover:underline">
              {titleCase(`${v.make} ${v.model}`)}
            </Link>
            <p className="truncate body-sm text-(--text-secondary)">
              {variant ? `${variant} · ${v.stockId}` : v.stockId}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-(--border-secondary) pt-3">
            <Fact label="Fuel">{capitalizeWords(v.fuelType) ?? "—"}</Fact>
            <Fact label="Location">
              <LocationBadge
                location={v.currentLocation}
                outForTestDrive={v.outForTestDrive}
                testDriveExpectedBackAt={v.testDriveExpectedBackAt}
                compact
              />
            </Fact>
            <Fact label="Arrived">{formatDate(v.receivedDate)}</Fact>
            <Fact label="In stock">
              <DaysInStockChip days={v.daysInStock} />
            </Fact>
          </dl>
        </div>
      </Card>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="body-sm text-(--text-secondary)">{label}</dt>
      <dd className="body-md min-w-0">{children}</dd>
    </div>
  );
}
