"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, Mail, Pencil, Printer, Receipt } from "lucide-react";
import {
  Avatar,
  Badge,
  Banner,
  Card,
  EmptyState,
  IndexTable,
  Labelled,
  Modal,
  Page,
  Select,
  SkeletonBodyText,
  Tabs,
  TextField,
  type BadgeProgress,
  type BadgeTone,
} from "@/components/polaris";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { invoiceService } from "@/lib/services/invoice-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import {
  companyInvoiceFields,
  openPdfInNewTab,
  pdfService,
} from "@/lib/services/pdf-service";
import type { Invoice, InvoiceType, Vehicle } from "@/lib/types";
import { ExternalInvoiceList } from "@/components/external-invoices";
import { InvoiceDetailDialog } from "@/components/invoicing/invoice-detail-dialog";
import { RegPlate } from "@/components/shared/reg-plate";
import {
  FilterBar,
  matchesFilterState,
  useFilterState,
  type SelectFilter,
} from "@/components/filters/filter-bar";
// Row actions keep the app Button: the edit action relies on `title` (the
// permission hint) and `data-testid`, which the Polaris Button doesn't take.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";

type Filter = InvoiceType | "all";
type TopTab = "sales" | "purchase" | "external_job";

// Tab names must say what their dataset IS (GEN-46): the first tab is the
// company invoice LEDGER (sale/refund/purchase types — the type tabs below
// filter it); the other two are the vendor-bill modules. The old "Sales" /
// "Purchase Invoices" pair meant a purchase invoice lived under "Sales" while
// "Purchase Invoices" sat empty.
const TOP_TABS: { id: TopTab; content: string }[] = [
  { id: "sales", content: "All invoices" },
  { id: "purchase", content: "Auction purchases" },
  { id: "external_job", content: "External job bills" },
];

const TYPE_TABS: { id: Filter; content: string }[] = [
  { id: "all", content: "All" },
  { id: "purchase", content: "Purchase" },
  { id: "sale", content: "Sales" },
  { id: "refund", content: "Refunds / cancellations" },
];

const UPLOAD_TYPE_OPTIONS = [
  { label: "Purchase", value: "purchase" },
  { label: "Sale", value: "sale" },
];

function parseTopTab(v: string | null): TopTab {
  return TOP_TABS.some((t) => t.id === v) ? (v as TopTab) : "sales";
}

export default function InvoicingPage() {
  const baseId = useId();
  const uploadTypeId = `${baseId}-upload-type`;
  const partyNameId = `${baseId}-party-name`;
  const invoiceDateId = `${baseId}-invoice-date`;
  const totalId = `${baseId}-total`;
  const attachmentId = `${baseId}-attachment`;
  const emailToId = `${baseId}-email-to`;
  const emailSubjectId = `${baseId}-email-subject`;
  const emailMessageId = `${baseId}-email-message`;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, company } = useAuth();
  const { can, isSuperUser } = usePermissions();
  const canEdit = isSuperUser || can("invoice:edit");
  // Recording/uploading an invoice is a write — gate it behind invoice edit or
  // external-invoice create authority rather than leaving it always-on.
  const canUpload =
    isSuperUser || can("invoice:edit") || can("external_invoice:create");
  // F-D5: top-tab state is mirrored in `?tab=` so the URL is a
  // deep-linkable + bookmarkable surface.
  const topTab: TopTab = parseTopTab(searchParams.get("tab"));
  function setTopTab(next: TopTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "sales") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const qs = params.toString();
    router.replace(qs ? `/admin/invoicing?${qs}` : "/admin/invoicing", {
      scroll: false,
    });
  }
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { state: filters, setState: setFilters } = useFilterState();
  const [vat, setVat] = useState<{
    inputVat: number;
    outputVat: number;
    net: number;
  } | null>(null);

  // View / Email / Upload state
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [emailing, setEmailing] = useState<Invoice | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFields, setUploadFields] = useState({
    type: "purchase" as InvoiceType,
    partyName: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    total: "",
  });

  const refresh = async () => {
    if (!company) return;
    const [list, summary] = await Promise.all([
      invoiceService.getAll(company.id),
      invoiceService.vatSummary(company.id),
    ]);
    setInvoices(list);
    setVat(summary);
  };

  useEffect(() => {
    // refresh() sets invoices/vat after an async load — a deliberate data-fetch
    // effect, not a synchronous render-loop setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  // Vehicles power the reg search in the filter bar (GEN-23).
  useEffect(() => {
    if (!company) return;
    void vehicleService.getAll(company.id).then(setVehicles);
  }, [company]);

  const vehicleById = useMemo(() => {
    const m = new Map<string, Vehicle>();
    vehicles.forEach((v) => m.set(v.id, v));
    return m;
  }, [vehicles]);

  // Deep-link: `?view=<invoiceId>` opens that invoice's detail modal (e.g. when
  // clicking a row in Closed Deals, GEN-21). Consume the param once loaded so
  // closing the modal doesn't immediately re-open it.
  useEffect(() => {
    const viewId = searchParams.get("view");
    if (!viewId || !invoices) return;
    const inv = invoices.find((i) => i.id === viewId);
    if (!inv) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewing(inv);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("view");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, invoices, router]);

  const filtered = useMemo(() => {
    if (!invoices) return null;
    if (filter === "all") return invoices;
    return invoices.filter((i) => i.type === filter);
  }, [invoices, filter]);

  // SPEC Point 4 — sale invoices that a refund invoice reverses, so we
  // can badge them "Refunded" (derived; no schema needed).
  const refundedSaleIds = useMemo(() => {
    const s = new Set<string>();
    for (const i of invoices ?? []) {
      if (i.type === "refund" && i.relatedInvoiceId) {
        s.add(i.relatedInvoiceId);
      }
    }
    return s;
  }, [invoices]);

  // SPEC Point 5 — refunds summary (this month / YTD / count).
  const refundSummary = useMemo(() => {
    const now = new Date();
    const yStart = `${now.getFullYear()}-01-01`;
    const mStart = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}-01`;
    let month = 0;
    let ytd = 0;
    let count = 0;
    for (const i of invoices ?? []) {
      if (i.type !== "refund") continue;
      count++;
      if (i.invoiceDate >= yStart) ytd += i.total;
      if (i.invoiceDate >= mStart) month += i.total;
    }
    return { month, ytd, count };
  }, [invoices]);

  // KPI cards (Variation A) — derived from sale + refund invoices.
  const kpis = useMemo(() => {
    const all = invoices ?? [];
    const sales = all.filter((i) => i.type === "sale");
    const sum = (arr: Invoice[]) => arr.reduce((a, i) => a + i.total, 0);
    const outstanding = sales.filter(
      (i) => i.status !== "paid" && i.status !== "cancelled",
    );
    const paidSales = sales.filter((i) => i.status === "paid");
    const refunds = all.filter((i) => i.type === "refund");
    return {
      invoiced: sum(sales),
      invoicedN: sales.length,
      outstanding: sum(outstanding),
      outstandingN: outstanding.length,
      paid: sum(paidSales),
      paidN: paidSales.length,
      refunds: sum(refunds),
      refundsN: refunds.length,
    };
  }, [invoices]);

  // Status options derived from the visible invoices (schema-driven, GEN-23).
  const statusFilters: SelectFilter[] = useMemo(() => {
    if (!filtered) return [];
    const set = new Set(filtered.map((i) => i.status));
    if (set.size === 0) return [];
    return [
      {
        key: "status",
        label: "Status",
        allLabel: "All statuses",
        options: [...set]
          .sort()
          .map((s) => ({ value: s, label: INV_STATUS[s]?.label ?? s })),
      },
    ];
  }, [filtered]);

  // Search (invoice # / customer / vehicle reg) + invoice-date range + status,
  // applied on top of the type tab (GEN-23).
  const searched = useMemo(() => {
    if (!filtered) return null;
    return filtered.filter((i) =>
      matchesFilterState(i, filters, {
        searchText: () =>
          [
            i.invoiceNumber,
            i.partyName,
            i.buyerName,
            i.vehicleId ? vehicleById.get(i.vehicleId)?.registration : null,
          ]
            .filter(Boolean)
            .join(" "),
        date: () => i.invoiceDate,
        selectValue: (_row, key) => (key === "status" ? i.status : null),
      }),
    );
  }, [filtered, filters, vehicleById]);

  async function handleSendEmail() {
    if (!emailing || !user) return;
    await invoiceService.updateStatus(emailing.id, "sent", user.id);
    toast.success(`Sent to ${emailing.partyEmail ?? emailing.partyName}`);
    setEmailing(null);
    void refresh();
  }

  async function handlePrint(inv: Invoice) {
    if (!company) return;
    try {
      await openPdfInNewTab(
        () =>
          pdfService.generateInvoice({
            invoice: inv,
            ...companyInvoiceFields(company),
          }),
        `${inv.invoiceNumber}.pdf`,
      );
    } catch (e) {
      console.error("[invoicing] print failed", e);
      toast.error("Couldn't open the invoice for printing.");
    }
  }

  async function handleUpload() {
    if (!user || !company) return;
    const total = Number(uploadFields.total.replace(/[£,\s]/g, ""));
    if (Number.isNaN(total) || total <= 0) {
      toast.error("Enter a valid total");
      return;
    }
    await invoiceService.create(
      {
        companyId: company.id,
        type: uploadFields.type,
        vehicleId: null,
        partyName: uploadFields.partyName,
        partyPhone: null,
        partyEmail: null,
        invoiceDate: uploadFields.invoiceDate,
        dueDate: null,
        vatScheme: "zero_rated",
        lineItems: [
          {
            type: "addon_paid",
            addonCategory: null,
            description: "Uploaded invoice",
            quantity: 1,
            unitPrice: total,
            total,
            lineType: "fee",
            addonType: null,
            vatRate: 0,
          },
        ],
        payment: null,
        notes: uploadFile ? `Attached: ${uploadFile.name}` : null,
        attachmentUrl: uploadFile ? `mock://${uploadFile.name}` : null,
      },
      user.id,
    );
    toast.success("Invoice recorded");
    setUploadOpen(false);
    setUploadFile(null);
    setUploadFields({
      type: "purchase",
      partyName: "",
      invoiceDate: new Date().toISOString().slice(0, 10),
      total: "",
    });
    void refresh();
  }

  const invoiceRows = (searched ?? []).map((inv) => {
    const vehicle = inv.vehicleId ? vehicleById.get(inv.vehicleId) : undefined;
    const canSend = can("invoice:send");
    return {
      id: inv.id,
      cells: [
        <Button
          key="number"
          variant="link"
          className="h-auto font-mono text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setViewing(inv);
          }}
        >
          {inv.invoiceNumber}
        </Button>,
        <span key="type" className="inline-flex items-center gap-1">
          <TypeBadge type={inv.type} />
          {refundedSaleIds.has(inv.id) && <Badge tone="warning">Refunded</Badge>}
        </span>,
        <span key="party" className="flex items-center gap-2">
          <span aria-hidden className="inline-flex">
            <Avatar
              size="xs"
              name={
                inv.partyName && inv.partyName !== "—" ? inv.partyName : undefined
              }
            />
          </span>
          <span className="truncate">{inv.partyName}</span>
        </span>,
        vehicle ? (
          <RegPlate key="reg" registration={vehicle.registration} size="sm" />
        ) : (
          <span key="reg" className="text-(--text-disabled)">
            —
          </span>
        ),
        <span key="date" className="text-(--text-secondary)">
          {formatDate(inv.invoiceDate)}
        </span>,
        formatCurrency(inv.subtotal),
        <span key="vat" className="text-(--text-secondary)">
          {formatCurrency(inv.vatAmount)}
        </span>,
        <span key="total" className="font-semibold">
          {formatCurrency(inv.total)}
        </span>,
        <StatusBadge key="status" status={inv.status} />,
        <div key="actions" className="flex justify-end gap-1">
          {inv.type === "sale" &&
            inv.status !== "paid" &&
            inv.status !== "cancelled" && (
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/sales/invoice-generation?invoiceId=${inv.id}`);
                }}
                title={canEdit ? "Edit" : "Permission required: Edit Invoice"}
                aria-label="Edit invoice"
                data-testid={`edit-invoice-${inv.id}`}
              >
                <Pencil />
              </Button>
            )}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setViewing(inv);
            }}
            title="View"
            aria-label="View invoice"
          >
            <Eye />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={!canSend}
            onClick={(e) => {
              e.stopPropagation();
              setEmailing(inv);
            }}
            title={canSend ? "Email" : "Permission required: Send Invoice"}
            aria-label="Email invoice"
          >
            <Mail />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              void handlePrint(inv);
            }}
            title="Print PDF"
            aria-label="Print invoice PDF"
          >
            <Printer />
          </Button>
        </div>,
      ],
    };
  });

  return (
    <Page
      title="Invoicing"
      subtitle="Every invoice in one place: the company ledger, auction purchase bills and external job bills."
      fullWidth
      primaryAction={
        topTab === "sales" && canUpload
          ? { content: "Upload invoice", onAction: () => setUploadOpen(true) }
          : undefined
      }
    >
      <Tabs
        tabs={TOP_TABS}
        selected={Math.max(
          0,
          TOP_TABS.findIndex((t) => t.id === topTab),
        )}
        onSelect={(i) => setTopTab(TOP_TABS[i].id)}
      />

      {topTab === "sales" ? (
        <>
          {/* KPI tiles — derived from sale + refund invoices. */}
          <Card padding="0">
            <div className="grid grid-cols-2 gap-px bg-(--border-secondary) lg:grid-cols-4">
              <KpiTile
                label="Total invoiced"
                value={formatCurrency(kpis.invoiced)}
                sub={`${kpis.invoicedN} invoice${kpis.invoicedN === 1 ? "" : "s"}`}
              />
              <KpiTile
                label="Outstanding"
                value={formatCurrency(kpis.outstanding)}
                sub={`${kpis.outstandingN} unpaid`}
                tone="text-(--text-warning)"
              />
              <KpiTile
                label="Paid"
                value={formatCurrency(kpis.paid)}
                sub={`${kpis.paidN} settled`}
                tone="text-(--text-success)"
              />
              <KpiTile
                label="Refunds"
                value={formatCurrency(kpis.refunds)}
                sub={`${kpis.refundsN} issued`}
                tone="text-(--text-critical)"
              />
            </div>
          </Card>

          {/* Type views for the ledger: their own tab row, outside any card. */}
          <Tabs
            tabs={TYPE_TABS}
            selected={Math.max(
              0,
              TYPE_TABS.findIndex((t) => t.id === filter),
            )}
            onSelect={(i) => setFilter(TYPE_TABS[i].id)}
          />

          {/* Search / date / status filters for the ledger (FilterBar is its
              own bordered bar, as on Activity log and Deals). */}
          <FilterBar
            state={filters}
            onChange={setFilters}
            searchPlaceholder="Search invoice #, customer, reg…"
            dateLabel="Invoice"
            selects={statusFilters}
          />

          {filter === "refund" && (
            <Card>
              <div className="grid gap-4 sm:grid-cols-3">
                <SummaryStat
                  label="Refunds this month"
                  value={formatCurrency(refundSummary.month)}
                />
                <SummaryStat
                  label="Refunds YTD"
                  value={formatCurrency(refundSummary.ytd)}
                />
                <SummaryStat
                  label="Total refund invoices"
                  value={String(refundSummary.count)}
                />
              </div>
            </Card>
          )}

          {!searched ? (
            <Card>
              <SkeletonBodyText lines={8} />
            </Card>
          ) : searched.length === 0 ? (
            <EmptyState icon={<Receipt />} heading="No invoices in this view">
              Switch tabs or create one.
            </EmptyState>
          ) : (
            // Clicking anywhere on a row opens the invoice, as before. The
            // table owns its rows, so the click is picked up here and mapped
            // back by row position; the invoice number is the keyboard route.
            <div
              className="[&_tbody_tr]:cursor-pointer"
              onClick={(e) => {
                const tr = (e.target as HTMLElement).closest<HTMLTableRowElement>(
                  "tbody tr",
                );
                const inv = tr ? searched[tr.sectionRowIndex] : undefined;
                if (inv) setViewing(inv);
              }}
            >
              <IndexTable
                selectable={false}
                headings={[
                  { title: "Invoice #" },
                  { title: "Type" },
                  { title: "Party" },
                  { title: "Reg" },
                  { title: "Date" },
                  { title: "Subtotal", alignment: "end" },
                  { title: "VAT", alignment: "end" },
                  { title: "Total", alignment: "end" },
                  { title: "Status" },
                  { title: "" },
                ]}
                rows={invoiceRows}
              />
            </div>
          )}

          <Card title="VAT summary">
            <p className="text-xs text-(--text-secondary)">
              Input VAT (purchases) − Output VAT (sales) = net.
            </p>
            {vat ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <VatStat label="Input VAT (purchases)" value={vat.inputVat} />
                <VatStat label="Output VAT (sales)" value={vat.outputVat} />
                <VatStat
                  label="Net VAT"
                  value={vat.net}
                  tone={vat.net > 0 ? "negative" : "positive"}
                />
              </div>
            ) : (
              <SkeletonBodyText lines={2} />
            )}
          </Card>
        </>
      ) : topTab === "purchase" ? (
        <ExternalInvoiceList kind="auction_purchase" />
      ) : (
        <ExternalInvoiceList kind="external_job" />
      )}

      {/* Upload modal */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload invoice"
        primaryAction={{
          content: "Save invoice",
          onAction: () => void handleUpload(),
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setUploadOpen(false) },
        ]}
      >
        <div className="grid gap-3">
          <p className="text-(--text-secondary)">
            Capture an external invoice (PDF or image attachment).
          </p>
          <Select
            id={uploadTypeId}
            label="Type"
            options={UPLOAD_TYPE_OPTIONS}
            value={uploadFields.type}
            onChange={(v) =>
              setUploadFields((f) => ({ ...f, type: v as InvoiceType }))
            }
          />
          <TextField
            id={partyNameId}
            label="Party name"
            value={uploadFields.partyName}
            onChange={(v) => setUploadFields((f) => ({ ...f, partyName: v }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Labelled id={invoiceDateId} label="Invoice date">
              <Input
                id={invoiceDateId}
                type="date"
                value={uploadFields.invoiceDate}
                onChange={(e) =>
                  setUploadFields((f) => ({
                    ...f,
                    invoiceDate: e.target.value,
                  }))
                }
              />
            </Labelled>
            <TextField
              id={totalId}
              label="Total"
              prefix="£"
              inputMode="decimal"
              placeholder="0.00"
              value={uploadFields.total}
              onChange={(v) => setUploadFields((f) => ({ ...f, total: v }))}
            />
          </div>
          <Labelled id={attachmentId} label="Attachment">
            <Input
              id={attachmentId}
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
          </Labelled>
        </div>
      </Modal>

      {/* View modal — shared in-app invoice detail (also used on Closed Deals). */}
      <InvoiceDetailDialog
        invoice={viewing}
        company={company}
        onOpenChange={(o) => {
          if (!o) setViewing(null);
        }}
        // A payment can flip the invoice to Paid, so the list behind the
        // dialog has to re-read it (GEN-73).
        onChanged={() => void refresh()}
      />

      {/* Email modal */}
      <Modal
        open={emailing !== null}
        onClose={() => setEmailing(null)}
        title={emailing ? `Email ${emailing.invoiceNumber}` : "Email invoice"}
        primaryAction={{
          content: "Send email",
          onAction: () => void handleSendEmail(),
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setEmailing(null) }]}
      >
        {emailing && (
          <div key={emailing.id} className="grid gap-3">
            <TextField
              id={emailToId}
              label="To"
              type="email"
              defaultValue={emailing.partyEmail ?? ""}
              placeholder="recipient@example.com"
            />
            <TextField
              id={emailSubjectId}
              label="Subject"
              defaultValue={`Invoice ${emailing.invoiceNumber}`}
            />
            <TextField
              id={emailMessageId}
              label="Message"
              multiline={4}
              defaultValue="Please find your invoice attached."
            />
            <Banner tone="info">
              Mock send: marks the invoice as sent and writes the activity log.
            </Banner>
          </div>
        )}
      </Modal>
    </Page>
  );
}

/* Helpers --------------------------------------------------------------- */

function KpiTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  /** Text colour token class for the value. */
  tone?: string;
}) {
  return (
    <div className="bg-(--bg-surface) p-4">
      <div className="text-xs font-medium text-(--text-secondary)">{label}</div>
      <div className={cn("heading-lg mt-1 tabular-nums", tone)}>{value}</div>
      <div className="mt-0.5 text-xs text-(--text-secondary)">{sub}</div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-(--text-secondary)">{label}</div>
      <div className="mt-0.5 font-semibold tabular-nums">{value}</div>
    </div>
  );
}

/** Invoice status → badge. Unpaid states get an empty pip, Paid a full one. */
const INV_STATUS: Record<
  string,
  { label: string; tone?: BadgeTone; progress?: BadgeProgress }
> = {
  draft: { label: "Draft", progress: "incomplete" },
  issued: { label: "Issued", tone: "info", progress: "incomplete" },
  sent: { label: "Sent", tone: "info", progress: "incomplete" },
  overdue: { label: "Overdue", tone: "critical", progress: "incomplete" },
  paid: { label: "Paid", tone: "success", progress: "complete" },
  cancelled: { label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const m = INV_STATUS[status] ?? {
    label: status.charAt(0).toUpperCase() + status.slice(1),
  };
  return (
    <Badge tone={m.tone} progress={m.progress}>
      {m.label}
    </Badge>
  );
}

const TYPE_BADGE: Record<InvoiceType, { label: string; tone?: BadgeTone }> = {
  sale: { label: "Sale" },
  purchase: { label: "Purchase" },
  refund: { label: "Refund", tone: "critical" },
};

function TypeBadge({ type }: { type: InvoiceType }) {
  const m = TYPE_BADGE[type] ?? { label: type };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

function VatStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-(--radius-200) bg-(--bg-surface-secondary) p-3">
      <div className="text-xs font-medium text-(--text-secondary)">{label}</div>
      <div
        className={cn(
          "mt-1 text-base font-semibold tabular-nums",
          tone === "positive" && "text-(--text-success)",
          tone === "negative" && "text-(--text-critical)",
        )}
      >
        {formatCurrency(value)}
      </div>
    </div>
  );
}
