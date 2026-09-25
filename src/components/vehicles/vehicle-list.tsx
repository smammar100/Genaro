"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Fuel, Gauge, Settings2 } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  Pagination,
  Select,
  SkeletonBodyText,
  Tabs,
  TextField,
} from "@/components/polaris";
import { useAuth } from "@/contexts/auth-context";
import { vehicleService } from "@/lib/services/vehicle-service";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { RegPlate } from "@/components/shared/reg-plate";
import { VehicleStatusBadge } from "@/components/shared/status-badge";
import { DaysInStockChip } from "@/components/shared/days-in-stock-chip";
import { capitalizeWords, formatCurrency, titleCase } from "@/lib/utils";
import { variantLabel } from "@/lib/vehicle-variant";

/** Saved views: each is a set of lifecycle statuses (null = every car). */
const VIEWS: { id: string; label: string; statuses: VehicleStatus[] | null }[] = [
  { id: "all", label: "All", statuses: null },
  { id: "arriving", label: "Arriving", statuses: ["received", "inspection_pending"] },
  { id: "prep", label: "In prep", statuses: ["being_prepared", "photos_pending", "photos_ready"] },
  { id: "ready", label: "Ready", statuses: ["ready"] },
  { id: "listed", label: "Listed", statuses: ["listed", "reserved"] },
  { id: "sold", label: "Sold", statuses: ["sold", "returned"] },
];

type SortKey = "days" | "newest" | "priceHigh" | "priceLow";
const SORTS: { label: string; value: SortKey }[] = [
  { label: "Days in stock", value: "days" },
  { label: "Newest arrivals", value: "newest" },
  { label: "Price: high to low", value: "priceHigh" },
  { label: "Price: low to high", value: "priceLow" },
];

const PAGE_SIZE = 20;

/** Price the row leads with: the sale price once sold, else the web price. */
function headlinePrice(v: Vehicle): number | null {
  if (v.status === "sold" && v.sellingPrice !== null) return v.sellingPrice;
  return v.listingPrice;
}

function sortVehicles(list: Vehicle[], key: SortKey): Vehicle[] {
  const price = (v: Vehicle) => headlinePrice(v) ?? -1;
  const sorted = [...list];
  switch (key) {
    case "days":
      return sorted.sort((a, b) => b.daysInStock - a.daysInStock);
    case "newest":
      return sorted.sort((a, b) => a.daysInStock - b.daysInStock);
    case "priceHigh":
      return sorted.sort((a, b) => price(b) - price(a));
    case "priceLow":
      return sorted.sort((a, b) => price(a) - price(b));
  }
}

function Spec({ icon: Icon, children }: { icon: typeof Calendar; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 body-sm text-(--text-secondary)">
      <Icon aria-hidden className="size-4" />
      {children}
    </span>
  );
}

function VehicleRow({ v }: { v: Vehicle }) {
  const href = `/vehicles/${v.id}`;
  const price = headlinePrice(v);
  const margin = price !== null ? price - v.baseCost : null;
  const sold = v.status === "sold";

  return (
    <Card padding="0">
      <div className="grid items-stretch md:grid-cols-[220px_1fr_200px]">
        <Link href={href} tabIndex={-1} aria-hidden className="block">
          <VehicleImage
            vehicle={v}
            variant="card"
            sizes="220px"
            className="h-44 w-full rounded-none md:aspect-auto md:h-full"
          />
        </Link>

        <div className="flex min-w-0 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <RegPlate registration={v.registration} size="sm" />
            <span className="body-sm text-(--text-secondary)">{v.stockId}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={href} className="heading-sm text-(--text) hover:underline">
              {`${v.year} ${titleCase(`${v.make} ${v.model}`)}`}
            </Link>
            <VehicleStatusBadge status={v.status} />
          </div>
          <p className="truncate body-sm text-(--text-secondary)">{variantLabel(v, "")}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Spec icon={Calendar}>{v.year}</Spec>
            <Spec icon={Gauge}>{`${v.mileage.toLocaleString("en-GB")} mi`}</Spec>
            <Spec icon={Fuel}>{capitalizeWords(v.fuelType)}</Spec>
            <Spec icon={Settings2}>{capitalizeWords(v.transmission)}</Spec>
          </div>
          <div className="mt-auto pt-1">
            <DaysInStockChip days={v.daysInStock} />
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-(--border-secondary) p-4 md:border-l md:border-t-0">
          <div>
            <p className="body-sm text-(--text-secondary)">{sold ? "Sold for" : "Web price"}</p>
            <p className="heading-lg">{price !== null ? formatCurrency(price) : "No price"}</p>
            {margin !== null && (
              <p
                className={
                  margin >= 0
                    ? "body-sm text-(--text-success)"
                    : "body-sm text-(--text-critical)"
                }
              >
                {`${formatCurrency(margin)} margin`}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="primary" fullWidth url={href}>
              Open vehicle
            </Button>
            <Button fullWidth url={`${href}?tab=financials`}>
              Edit price
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * All vehicles as wide rows (Kayak / TravelPerk pattern): photo, plate and
 * specs, then the price panel with the row's actions. Saved-view tabs by
 * lifecycle stage sit on their own row under the page header; search and sort
 * share a card above the list, and pagination sits below it.
 */
export function VehicleList({ onAddVehicle }: { onAddVehicle: () => void }) {
  const { company } = useAuth();
  const [vehicles, setVehicles] = React.useState<Vehicle[] | null>(null);
  const [view, setView] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("days");
  const [page, setPage] = React.useState(0);

  React.useEffect(() => {
    if (!company) return;
    let active = true;
    void vehicleService.getAll(company.id).then((list) => {
      if (active) setVehicles(list);
    });
    return () => {
      active = false;
    };
  }, [company]);

  const counts = React.useMemo(
    () =>
      VIEWS.map((vw) =>
        vehicles
          ? vehicles.filter((v) => !vw.statuses || vw.statuses.includes(v.status)).length
          : null,
      ),
    [vehicles],
  );

  const filtered = React.useMemo(() => {
    if (!vehicles) return null;
    const statuses = VIEWS[view].statuses;
    const q = query.trim().toLowerCase();
    const matches = vehicles.filter(
      (v) =>
        (!statuses || statuses.includes(v.status)) &&
        (!q ||
          `${v.registration} ${v.registration.replace(/\s/g, "")} ${v.stockId} ${v.make} ${v.model} ${v.year}`
            .toLowerCase()
            .includes(q)),
    );
    return sortVehicles(matches, sort);
  }, [vehicles, view, query, sort]);

  const pageCount = filtered ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : 1;
  const current = Math.min(page, pageCount - 1);
  const rows = filtered?.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE) ?? null;

  return (
    <>
      {/* Saved views: their own row under the page header, outside any card. */}
      <Tabs
        tabs={VIEWS.map((vw, i) => ({
          id: vw.id,
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
        <Card padding="0">
          <div className="flex flex-wrap items-end gap-3 p-3">
            <div className="min-w-60 flex-1">
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
            <div className="w-56">
              <Select
                label="Sort by"
                labelInline
                options={SORTS}
                value={sort}
                onChange={(value) => setSort(value as SortKey)}
              />
            </div>
          </div>
        </Card>

        {rows === null ? (
          Array.from({ length: 3 }, (_, i) => (
            <Card key={i}>
              <SkeletonBodyText lines={4} />
            </Card>
          ))
        ) : rows.length === 0 ? (
          <Card>
            {vehicles && vehicles.length === 0 ? (
              <EmptyState
                icon="ProductsMinor"
                heading="No vehicles yet"
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
                Try a different search or view.
              </EmptyState>
            )}
          </Card>
        ) : (
          <>
            {rows.map((v) => (
              <VehicleRow key={v.id} v={v} />
            ))}
            {pageCount > 1 && (
              <div className="flex justify-center py-2">
                <Pagination
                  hasPrevious={current > 0}
                  hasNext={current < pageCount - 1}
                  onPrevious={() => setPage(current - 1)}
                  onNext={() => setPage(current + 1)}
                  label={`Page ${current + 1} of ${pageCount}`}
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
