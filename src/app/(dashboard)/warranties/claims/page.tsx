"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { claimService } from "@/lib/services/claim-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { warrantyService } from "@/lib/services/warranty-service";
import type { Vehicle, Warranty, WarrantyClaim } from "@/lib/types";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { EmptyState, Page } from "@/components/polaris";
import { KpiStrip } from "@/components/warranties/kpi-strip";
import {
  FilterChips,
  type FilterOption,
} from "@/components/warranties/filter-chips";
import { WarrantyListCard } from "@/components/warranties/warranty-list-card";
import { ClaimsTable } from "@/components/warranties/warranty-table";
import { NewClaimDialog } from "@/components/warranties/new-claim-dialog";
import { WarrantyDetailSheet } from "@/components/warranties/warranty-detail-sheet";

type Filter =
  | "open"
  | "complaints"
  | "all"
  | "under_review"
  | "approved"
  | "resolved"
  | "rejected";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "complaints", label: "Complaints" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export default function ClaimsPage() {
  const { company } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get("filter") as Filter | null) ?? "open";
  const initialQuery = searchParams.get("q") ?? "";

  const [claims, setClaims] = useState<WarrantyClaim[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [query, setQuery] = useState(initialQuery);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newClaimOpen, setNewClaimOpen] = useState(false);
  const [sheetWarranty, setSheetWarranty] = useState<Warranty | null>(null);
  const refetch = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!company) return;
    let cancel = false;
    void Promise.all([
      claimService.getAll(company.id),
      vehicleService.getAll(company.id),
      warrantyService.getAll(company.id),
    ]).then(([c, v, w]) => {
      if (cancel) return;
      setClaims(c);
      setVehicles(v);
      setWarranties(w);
    });
    return () => {
      cancel = true;
    };
  }, [company, refreshKey]);

  useRealtimeTable({
    table: "warranty_claims",
    companyId: company?.id,
    invalidatePrefix: "claims:",
    onChange: () => setRefreshKey((k) => k + 1),
  });

  // Warranty changes feed the "Warranty" column + KPIs on this page.
  useRealtimeTable({
    table: "warranties",
    companyId: company?.id,
    invalidatePrefix: "warranties:",
    onChange: () => setRefreshKey((k) => k + 1),
  });

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (filter === "open") next.delete("filter");
    else next.set("filter", filter);
    if (!query) next.delete("q");
    else next.set("q", query);
    router.replace(`?${next.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query]);

  const filterOptions: FilterOption<Filter>[] = useMemo(() => {
    if (!claims) return FILTERS;
    return FILTERS.map((f) => ({
      ...f,
      count:
        f.value === "all"
          ? claims.length
          : f.value === "open"
            ? claims.filter(
                (c) => c.status === "open" || c.status === "under_review",
              ).length
            : f.value === "complaints"
              ? claims.filter((c) => c.isComplaint).length
              : claims.filter((c) => c.status === f.value).length,
    }));
  }, [claims]);

  const rows = useMemo(() => {
    if (!claims) return null;
    const q = query.trim().toLowerCase();
    return claims
      .filter((c) => {
        if (filter === "all") return true;
        if (filter === "open")
          return c.status === "open" || c.status === "under_review";
        if (filter === "complaints") return c.isComplaint;
        return c.status === filter;
      })
      .filter((c) => {
        if (!q) return true;
        const v = vehicles.find((x) => x.id === c.vehicleId);
        const hay = `${c.customerName} ${v?.registration ?? ""} ${c.issueDescription} ${c.id}`.toLowerCase();
        return hay.includes(q);
      })
      .map((c) => ({
        ...c,
        vehicle: vehicles.find((x) => x.id === c.vehicleId) ?? null,
        warranty: warranties.find((w) => w.id === c.warrantyId) ?? null,
      }));
  }, [claims, vehicles, warranties, filter, query]);

  return (
    <Page
      title="Claims"
      subtitle="Customer claims raised against active warranties. Track each one from raised through to resolution."
      fullWidth
      primaryAction={{
        content: "File claim",
        onAction: () => setNewClaimOpen(true),
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
        searchLabel="Search claims"
        searchPlaceholder="Search customer, vehicle, issue…"
        loading={!rows}
      >
        {rows && rows.length === 0 ? (
          <EmptyState className="rounded-none shadow-none" heading="No claims match" icon={<ShieldAlert />}>
            {query
              ? "Try a different search term or clear the filter."
              : "Customer claims will appear here when filed against a warranty."}
          </EmptyState>
        ) : rows ? (
          <ClaimsTable
            rows={rows}
            onRowClick={(c) => {
              const w = warranties.find((x) => x.id === c.warrantyId);
              if (w) setSheetWarranty(w);
            }}
          />
        ) : null}
      </WarrantyListCard>

      <NewClaimDialog
        open={newClaimOpen}
        onOpenChange={setNewClaimOpen}
        onCreated={refetch}
      />

      <WarrantyDetailSheet
        warranty={sheetWarranty}
        onOpenChange={(open) => !open && setSheetWarranty(null)}
        onChanged={refetch}
      />
    </Page>
  );
}
