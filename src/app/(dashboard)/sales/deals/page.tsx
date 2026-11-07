"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, Eye } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { salesService } from "@/lib/services/sales-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { authService } from "@/lib/services/auth-service";
import { invoiceService } from "@/lib/services/invoice-service";
import {
  companyInvoiceFields,
  downloadBlob,
  pdfService,
} from "@/lib/services/pdf-service";
import { toast } from "@/lib/toast";
import type { Invoice, SalesDeal, User, Vehicle } from "@/lib/types";
import {
  Button,
  Card,
  EmptyState,
  Page,
  SkeletonBodyText,
  EmptyStateIllustration,
} from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import {
  UserCell,
  DataGridGroupHeaderRow,
  GROUP_INDENT,
  DataGridHeaderRow,
  DataGridRow,
  DataGridShell,
  DataGridTable,
  useRowGroups,
  useSort,
  type ColumnDef,
} from "@/components/data-grid";
import {
  FilterBar,
  matchesFilterState,
  useFilterState,
  type SelectFilter,
} from "@/components/filters/filter-bar";
import { InvoiceDetailDialog } from "@/components/invoicing/invoice-detail-dialog";

/**
 * A vehicle's purchase source as a single filterable label — the auction house
 * for auction buys (so "BCA" is a first-class option, per the client's
 * BCA-vs-non-BCA use case), otherwise the purchase-source type.
 */
const SOURCE_TYPE_LABEL: Record<string, string> = {
  private: "Private",
  trade_in: "Trade-in",
  dealer: "Dealer",
  other: "Other",
};
function sourceLabel(v: Vehicle | undefined): string {
  if (!v) return "—";
  if (v.purchaseSource === "auction") {
    return v.auctionHouse?.trim() || "Auction";
  }
  return SOURCE_TYPE_LABEL[v.purchaseSource] ?? "Other";
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
/** "2026-07" → "July 2026" for the monthly group banners. */
function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const month = MONTHS[Number(m) - 1];
  return month ? `${month} ${y}` : key;
}
/**
 * One completed sale: a deal that reached Completed sale in the app, or a car
 * the master sheet has as SOLD with no such deal (the sales from before the
 * app, imported from the spreadsheet; bug list 2026-11-02, item 11).
 */
interface SaleRow {
  id: string;
  deal: SalesDeal | null;
  vehicleId: string;
  customerName: string;
  price: number | null;
  /** Date of sale; null for an old sheet row that never recorded one. */
  date: string | null;
  agent: string | null;
}

/** Group key for sales with no date. */
const NO_DATE = "none";
const saleMonth = (r: SaleRow): string => r.date?.slice(0, 7) ?? NO_DATE;
const saleYear = (r: SaleRow): string => r.date?.slice(0, 4) ?? NO_DATE;
const groupLabel = (key: string): string =>
  key === NO_DATE ? "Date not recorded" : monthLabel(key);
/** Inside its year a month needs no year: "2026-07" → "July". */
const monthName = (key: string): string =>
  key === NO_DATE ? "Date not recorded" : (MONTHS[Number(key.slice(5, 7)) - 1] ?? key);

export default function DealsPage() {
  const { company } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [deals, setDeals] = useState<SalesDeal[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!company) return;
    void Promise.all([
      salesService.getAll(company.id),
      vehicleService.getAll(company.id),
      authService.getUsersForCompany(company.id),
      invoiceService.getAll(company.id),
    ]).then(([d, v, u, inv]) => {
      setDeals(d);
      setVehicles(v);
      setUsers(u);
      setInvoices(inv);
    });
  }, [company]);

  const { state: filters, setState: setFilters } = useFilterState();

  const vehicleById = useMemo(() => {
    const m = new Map<string, Vehicle>();
    vehicles.forEach((v) => m.set(v.id, v));
    return m;
  }, [vehicles]);
  const userById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);
  // Resolve a completed sale's invoice: prefer the explicit saleId link, else
  // fall back to the sale invoice for the deal's vehicle (demo data doesn't
  // always populate saleId).
  const invoiceFor = useMemo(() => {
    const bySale = new Map<string, Invoice>();
    const saleByVehicle = new Map<string, Invoice>();
    invoices.forEach((i) => {
      if (i.saleId) bySale.set(i.saleId, i);
      if (i.type === "sale" && i.vehicleId && !saleByVehicle.has(i.vehicleId)) {
        saleByVehicle.set(i.vehicleId, i);
      }
    });
    return (r: SaleRow): Invoice | undefined =>
      (r.deal ? bySale.get(r.deal.id) : undefined) ?? saleByVehicle.get(r.vehicleId);
  }, [invoices]);

  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  async function downloadInvoice(inv: Invoice): Promise<void> {
    if (!company) return;
    setDownloadingId(inv.id);
    try {
      const vehicle = inv.vehicleId ? (vehicleById.get(inv.vehicleId) ?? null) : null;
      const blob = await pdfService.generateInvoice({
        invoice: inv,
        vehicle,
        ...companyInvoiceFields(company),
      });
      downloadBlob(blob, `${inv.invoiceNumber}.pdf`);
    } catch {
      toast.error("Couldn't generate the invoice PDF.");
    } finally {
      setDownloadingId(null);
    }
  }

  // Every completed sale, the moment its deal reaches Completed sale. It
  // used to wait for the invoice (2026-07-14); the client wants it listed
  // straight away, with the invoice still to raise (call 2026-10-31). The
  // master sheet's earlier sales sit alongside, so the history is complete.
  const closed = useMemo<SaleRow[] | null>(() => {
    if (!deals) return null;
    const won = deals.filter((d) => d.stage === "completed_sale");
    const dealt = new Set(won.map((d) => d.vehicleId));
    const fromDeals = won.map((d): SaleRow => {
      const v = vehicleById.get(d.vehicleId);
      return {
        id: d.id,
        deal: d,
        vehicleId: d.vehicleId,
        customerName: d.customerName,
        // The car's recorded selling price is the final figure (the sale
        // dialog and invoicing both write it); the deal's own is a fallback.
        price: v?.sellingPrice ?? d.agreedPrice ?? d.offerPrice ?? null,
        date: d.completionDate ?? v?.dateSold ?? d.updatedAt,
        agent: userById.get(d.sellingAgent ?? "")?.name ?? null,
      };
    });
    const saleInvoice = new Map<string, Invoice>();
    invoices.forEach((i) => {
      if (i.type === "sale" && i.vehicleId && !saleInvoice.has(i.vehicleId)) {
        saleInvoice.set(i.vehicleId, i);
      }
    });
    const fromSheet = vehicles
      .filter((v) => v.saleStatus === "sold" && !dealt.has(v.id))
      .map((v): SaleRow => {
        const inv = saleInvoice.get(v.id);
        return {
          id: `sheet-${v.id}`,
          deal: null,
          vehicleId: v.id,
          customerName: inv?.buyerName?.trim() || inv?.partyName?.trim() || "—",
          price: v.sellingPrice,
          date: v.dateSold,
          agent: v.sellingAgent?.trim() || null,
        };
      });
    return [...fromDeals, ...fromSheet];
  }, [deals, vehicles, invoices, vehicleById, userById]);

  // Source options derived from the actual closed deals (schema-driven), so
  // specific auction houses (e.g. "BCA Auction") only appear when present.
  const sourceFilters: SelectFilter[] = useMemo(() => {
    if (!closed) return [];
    const labels = new Set<string>();
    closed.forEach((r) => {
      const label = sourceLabel(vehicleById.get(r.vehicleId));
      if (label !== "—") labels.add(label);
    });
    if (labels.size === 0) return [];
    return [
      {
        key: "source",
        label: "Source",
        allLabel: "All sources",
        options: [...labels].sort().map((l) => ({ value: l, label: l })),
      },
    ];
  }, [closed, vehicleById]);

  const filtered = useMemo(() => {
    if (!closed) return null;
    return closed.filter((r) => {
      const v = vehicleById.get(r.vehicleId);
      return matchesFilterState(r, filters, {
        searchText: () =>
          [v?.registration, v?.make, v?.model, v?.stockId, r.customerName, r.agent]
            .filter(Boolean)
            .join(" "),
        date: () => r.date,
        selectValue: (_row, key) => (key === "source" ? sourceLabel(v) : null),
      });
    });
  }, [closed, filters, vehicleById]);

  // Sorting — default newest completion first. The comparators are memoised
  // so useSort (and the grouping below) don't re-sort on every render.
  const comparators = useMemo(
    () => ({
      reg: (a: SaleRow, b: SaleRow) =>
        (vehicleById.get(a.vehicleId)?.registration ?? "").localeCompare(
          vehicleById.get(b.vehicleId)?.registration ?? "",
        ),
      customerName: (a: SaleRow, b: SaleRow) =>
        a.customerName.localeCompare(b.customerName),
      price: (a: SaleRow, b: SaleRow) => (a.price ?? 0) - (b.price ?? 0),
      // Undated sheet sales count as the oldest.
      completed: (a: SaleRow, b: SaleRow) =>
        (a.date ?? "").localeCompare(b.date ?? ""),
    }),
    [vehicleById],
  );
  const { sorted, sortKey, sortDir, onSort } = useSort<SaleRow>(
    filtered ?? undefined,
    comparators,
    { key: "completed", dir: "desc" },
  );

  // Grouped by year, then month: each year opens on its months, closed, and a
  // month opens on its sales (bug list 2026-11-04). A search opens every
  // month, so the matching car is on screen.
  const searching = filters.search.trim() !== "";
  const { groups: years, isCollapsed: isYearCollapsed, toggle: toggleYear } =
    useRowGroups(sorted, saleYear, groupLabel);
  const { groups: months, isCollapsed: isMonthClosed, toggle: toggleMonth } =
    useRowGroups(sorted, saleMonth, monthName, { defaultCollapsed: true });
  const isMonthCollapsed = (key: string): boolean =>
    !searching && isMonthClosed(key);
  const monthsOf = (year: string) =>
    (months ?? []).filter((m) => m.key.slice(0, 4) === year.slice(0, 4));

  // Not memoized: the Invoice column closes over downloadingId so its spinner
  // stays current. The table is small, so rebuilding the column list is cheap.
  const cols: ColumnDef<SaleRow>[] = [
      {
        key: "vehicle",
        label: "Vehicle",
        type: "custom",
        sortable: true,
        sortKey: "reg",
        width: 240,
        render: (r) => {
          const v = vehicleById.get(r.vehicleId);
          return (
            <div className="flex min-w-0 items-center gap-2">
              {v ? (
                <RegPlate registration={v.registration} size="sm" />
              ) : null}
              <span className="body-sm truncate text-(--text-secondary)">
                {v ? `${v.make} ${v.model} · ${v.stockId}` : "—"}
              </span>
            </div>
          );
        },
      },
      {
        key: "customerName",
        label: "Customer",
        type: "text",
        sortable: true,
        width: 160,
      },
      {
        key: "price",
        label: "Price",
        type: "currency",
        sortable: true,
        width: 110,
        get: (r) => r.price,
      },
      {
        key: "source",
        label: "Source",
        type: "text",
        width: 130,
        get: (r) => sourceLabel(vehicleById.get(r.vehicleId)),
      },
      {
        key: "agent",
        label: "Agent",
        type: "custom",
        width: 150,
        get: (r) => r.agent,
        // A deal's agent is a member of staff; a sheet sale's is the sheet's
        // "lead from" wording (ZUTO, AUTO TRADER), so it isn't drawn as a person.
        render: (r) =>
          r.deal ? (
            <UserCell name={r.agent} />
          ) : (
            <span className="body-sm truncate">{r.agent ?? "—"}</span>
          ),
      },
      {
        key: "completed",
        label: "Completed",
        type: "date",
        sortable: true,
        width: 120,
        get: (r) => r.date,
      },
      {
        key: "invoice",
        label: "Invoice",
        type: "custom",
        width: 130,
        render: (r) => {
          const inv = invoiceFor(r);
          if (!inv) {
            return (
              <Button
                size="micro"
                url={`/sales/invoice-generation?vehicleId=${r.vehicleId}`}
                accessibilityLabel={`Generate invoice for ${r.customerName}`}
              >
                Generate invoice
              </Button>
            );
          }
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="tertiary"
                size="micro"
                icon={<Eye />}
                accessibilityLabel={`View invoice ${inv.invoiceNumber}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setViewingInvoice(inv);
                }}
              />
              <Button
                variant="tertiary"
                size="micro"
                icon={<Download />}
                accessibilityLabel={`Download invoice ${inv.invoiceNumber}`}
                loading={downloadingId === inv.id}
                onClick={(e) => {
                  e.stopPropagation();
                  void downloadInvoice(inv);
                }}
              />
            </div>
          );
        },
      },
    ];

  // Row click → open the invoice detail in place (a modal on this page, not a
  // navigation to Invoicing — GEN-42); a sale not yet invoiced opens its deal,
  // or the car when the sale came from the master sheet.
  function openSale(r: SaleRow): void {
    const inv = invoiceFor(r);
    if (inv) setViewingInvoice(inv);
    else if (r.deal) router.push(`/sales/pipeline/${r.deal.id}`);
    else router.push(vehicleDetailHref(r.vehicleId, pathname));
  }

  return (
    <Page
      title="Completed sales"
      subtitle="Your completed sales history, including earlier sales from the master sheet. Deals still in progress live on the sales pipeline."
      fullWidth
      secondaryActions={[{ content: "View pipeline", url: "/sales/pipeline" }]}
      // The search and filters sit in the header card, under the title.
      toolbar={
        closed && closed.length > 0 ? (
          <FilterBar
            bare
            state={filters}
            onChange={setFilters}
            searchPlaceholder="Search reg, make/model, customer…"
            dateLabel="Completed"
            selects={sourceFilters}
          />
        ) : undefined
      }
    >

      {!closed || !years ? (
        <Card>
          <SkeletonBodyText lines={8} />
        </Card>
      ) : closed.length === 0 ? (
        <EmptyState illustration={<EmptyStateIllustration variant="list" plates />} heading="No completed sales yet">
          Move a pipeline card to Completed sale, or mark a car sold on the master sheet, to see it here.
        </EmptyState>
      ) : years.length === 0 ? (
        <EmptyState illustration={<EmptyStateIllustration variant="search" plates />} heading="No deals match your filters">
          Try widening the date range or clearing a filter.
        </EmptyState>
      ) : (
        <DataGridShell className="min-h-0 flex-1">
          <DataGridTable cols={cols}>
            <DataGridHeaderRow
              cols={cols}
              sortKey={sortKey ?? undefined}
              sortDir={sortDir}
              onSort={onSort}
            />
            <tbody>
              {years.map((y) => {
                // Undated sheet sales have no months: one closed group.
                const undated = y.key === NO_DATE;
                const yearOpen = undated
                  ? !isMonthCollapsed(NO_DATE)
                  : !isYearCollapsed(y.key);
                return (
                  <Fragment key={y.key}>
                    <DataGridGroupHeaderRow
                      label={y.label}
                      count={y.rows.length}
                      collapsed={!yearOpen}
                      onToggle={() =>
                        undated ? toggleMonth(NO_DATE) : toggleYear(y.key)
                      }
                      span={cols.length}
                    />
                    {yearOpen &&
                      (undated
                        ? y.rows.map((r, i) => (
                            <DataGridRow
                              key={r.id}
                              row={r}
                              cols={cols}
                              index={i}
                              onClick={openSale}
                            />
                          ))
                        : monthsOf(y.key).map((m) => (
                            <Fragment key={m.key}>
                              <DataGridGroupHeaderRow
                                level={1}
                                label={m.label}
                                count={m.rows.length}
                                collapsed={isMonthCollapsed(m.key)}
                                onToggle={() => toggleMonth(m.key)}
                                span={cols.length}
                              />
                              {!isMonthCollapsed(m.key) &&
                                m.rows.map((r, i) => (
                                  <DataGridRow
                                    key={r.id}
                                    row={r}
                                    cols={cols}
                                    index={i}
                                    onClick={openSale}
                                    indent={GROUP_INDENT[2]}
                                  />
                                ))}
                            </Fragment>
                          )))}
                  </Fragment>
                );
              })}
            </tbody>
          </DataGridTable>
        </DataGridShell>
      )}

      <InvoiceDetailDialog
        invoice={viewingInvoice}
        company={company}
        vehicle={
          viewingInvoice?.vehicleId
            ? (vehicleById.get(viewingInvoice.vehicleId) ?? null)
            : null
        }
        onOpenChange={(o) => {
          if (!o) setViewingInvoice(null);
        }}
      />
    </Page>
  );
}
