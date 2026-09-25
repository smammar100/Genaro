"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { warrantyService } from "@/lib/services/warranty-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { claimService } from "@/lib/services/claim-service";
import type { Vehicle, Warranty, WarrantyClaim, WarrantyStatus } from "@/lib/types";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { effectiveWarrantyStatus } from "@/lib/warranty-status";
import { EmptyState, Page } from "@/components/polaris";
import { KpiStrip } from "@/components/warranties/kpi-strip";
import {
  FilterChips,
  type FilterOption,
} from "@/components/warranties/filter-chips";
import { WarrantyListCard } from "@/components/warranties/warranty-list-card";
import {
  WarrantyTable,
  type WarrantyRow,
} from "@/components/warranties/warranty-table";
import { NewWarrantyDialog } from "@/components/warranties/new-warranty-dialog";
import { NewClaimDialog } from "@/components/warranties/new-claim-dialog";
import { WarrantyDetailSheet } from "@/components/warranties/warranty-detail-sheet";

type Filter = "all" | WarrantyStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export default function InHouseWarrantiesPage() {
  const { company } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get("filter") as Filter | null) ?? "all";
  const initialQuery = searchParams.get("q") ?? "";

  const [warranties, setWarranties] = useState<Warranty[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [query, setQuery] = useState(initialQuery);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newWarrantyOpen, setNewWarrantyOpen] = useState(false);
  const [sheetWarranty, setSheetWarranty] = useState<Warranty | null>(null);
  const [fileClaimFor, setFileClaimFor] = useState<Warranty | null>(null);
  const refetch = () => setRefreshKey((k) => k + 1);

  // The role-based "New Warranty" CTA navigates here with ?new=1 — auto-open
  // the create dialog so the CTA lands the user straight in the create flow.
  useEffect(() => {
    if (searchParams.get("new") === "1") setNewWarrantyOpen(true);
  }, [searchParams]);

  // Initial + on-refresh data load.
  useEffect(() => {
    if (!company) return;
    let cancel = false;
    void Promise.all([
      warrantyService.getByType("in_house", company.id),
      vehicleService.getAll(company.id),
      claimService.getAll(company.id),
    ]).then(([w, v, c]) => {
      if (cancel) return;
      setWarranties(w);
      setVehicles(v);
      setClaims(c);
    });
    return () => {
      cancel = true;
    };
  }, [company, refreshKey]);

  // Realtime subscription — invalidate cache + bump refreshKey on any change.
  useRealtimeTable({
    table: "warranties",
    companyId: company?.id,
    invalidatePrefix: "warranties:",
    onChange: () => setRefreshKey((k) => k + 1),
  });

  // Claim changes (e.g. filed elsewhere) must refresh the per-row claim count.
  useRealtimeTable({
    table: "warranty_claims",
    companyId: company?.id,
    invalidatePrefix: "claims:",
    onChange: () => setRefreshKey((k) => k + 1),
  });

  // Sync filter + query to URL so views are shareable / bookmarkable.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (filter === "all") next.delete("filter");
    else next.set("filter", filter);
    if (!query) next.delete("q");
    else next.set("q", query);
    router.replace(`?${next.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query]);

  const filterOptions: FilterOption<Filter>[] = useMemo(() => {
    if (!warranties) return FILTERS;
    return FILTERS.map((f) => ({
      ...f,
      count:
        f.value === "all"
          ? warranties.length
          : warranties.filter((w) => effectiveWarrantyStatus(w) === f.value)
              .length,
    }));
  }, [warranties]);

  const rows: WarrantyRow[] | null = useMemo(() => {
    if (!warranties) return null;
    const q = query.trim().toLowerCase();
    return warranties
      .filter((w) => filter === "all" || effectiveWarrantyStatus(w) === filter)
      .filter((w) => {
        if (!q) return true;
        const v = vehicles.find((x) => x.id === w.vehicleId);
        const hay = `${w.customerName} ${v?.registration ?? ""} ${v?.make ?? ""} ${v?.model ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .map((w) => ({
        ...w,
        vehicle: vehicles.find((x) => x.id === w.vehicleId) ?? null,
        claimCount: claims.filter((c) => c.warrantyId === w.id).length,
      }));
  }, [warranties, vehicles, claims, filter, query]);

  return (
    <Page
      title="In-house warranties"
      subtitle="Warranties Car Capital provides to buyers directly. Track active cover, expiry dates and any claims."
      fullWidth
      primaryAction={{
        content: "New warranty",
        onAction: () => setNewWarrantyOpen(true),
      }}
    >
      {/* View tabs: their own row under the header, outside the list card. */}

      <KpiStrip refreshKey={refreshKey} />

      <FilterChips
        options={filterOptions}
        activeValue={filter}
        onChange={setFilter}
      />
      <WarrantyListCard
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search in-house warranties"
        searchPlaceholder="Search customer, vehicle…"
        loading={!rows}
      >
        {rows && rows.length === 0 ? (
          <EmptyState className="rounded-none shadow-none" heading="No in-house warranties" icon={<ShieldCheck />}>
            {query
              ? "Try a different search term or clear the filter."
              : "Create a warranty when you sell a vehicle with Car Capital cover."}
          </EmptyState>
        ) : rows ? (
          <WarrantyTable
            rows={rows}
            variant="in-house"
            onRowClick={(w) => setSheetWarranty(w)}
            onFileClaim={(w) => setFileClaimFor(w)}
          />
        ) : null}
      </WarrantyListCard>

      <NewWarrantyDialog
        open={newWarrantyOpen}
        onOpenChange={setNewWarrantyOpen}
        initialType="in_house"
        onCreated={refetch}
      />

      <WarrantyDetailSheet
        warranty={sheetWarranty}
        onOpenChange={(open) => !open && setSheetWarranty(null)}
        onChanged={refetch}
      />

      <NewClaimDialog
        open={fileClaimFor !== null}
        onOpenChange={(open) => !open && setFileClaimFor(null)}
        warrantyId={fileClaimFor?.id}
        onCreated={refetch}
      />
    </Page>
  );
}
