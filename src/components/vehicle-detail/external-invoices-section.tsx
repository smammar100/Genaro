"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Gavel,
  Image as ImageIcon,
  Paperclip,
  Receipt,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge, Button } from "@/components/polaris";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { externalInvoiceService } from "@/lib/services/external-invoice-service";
import { vendorService } from "@/lib/services/vendor-service";
import type {
  ExternalInvoice,
  InvoiceKind,
  UUID,
  Vendor,
} from "@/lib/types";
import { INVOICE_KIND_LABELS } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ExternalInvoiceForm } from "@/components/external-invoices";
import { Panel, Pill } from "./primitives";

interface Props {
  vehicleId: UUID;
}

/**
 * Spec v3.0 · Module D.5 — per-vehicle external-invoice strip on the
 * Financials tab. Shows total purchase-side + external-job spend, the
 * row list with attachment thumbnail + open-in-new-tab, and "+ Record"
 * buttons gated by `external_invoice:create`.
 */
export function ExternalInvoicesSection({ vehicleId }: Props) {
  const { company, user } = useAuth();
  const { can, isSuperUser } = usePermissions();
  const canCreate = isSuperUser || can("external_invoice:create");
  const canEditAny = isSuperUser || can("external_invoice:edit_any");
  const canDelete = isSuperUser || can("external_invoice:delete");

  const [rows, setRows] = useState<ExternalInvoice[] | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [defaultKind, setDefaultKind] = useState<InvoiceKind>("auction_purchase");
  const [editing, setEditing] = useState<ExternalInvoice | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!company?.id || !vehicleId) return;
    let cancelled = false;
    void Promise.all([
      externalInvoiceService.getByVehicle(vehicleId),
      vendorService.getAll(company.id),
    ]).then(([r, v]) => {
      if (cancelled) return;
      setRows(r);
      setVendors(v);
    });
    return () => {
      cancelled = true;
    };
  }, [company?.id, vehicleId, refreshTick]);

  const vendorById = useMemo(
    () => new Map(vendors.map((v) => [v.id, v])),
    [vendors],
  );

  const totalsByKind = useMemo(() => {
    const t = { auction_purchase: 0, external_job: 0 } as Record<
      InvoiceKind,
      number
    >;
    for (const r of rows ?? []) t[r.invoiceKind] += r.totalPence;
    return t;
  }, [rows]);

  const grandTotal = totalsByKind.auction_purchase + totalsByKind.external_job;

  function openNew(kind: InvoiceKind) {
    setDefaultKind(kind);
    setEditing(null);
    setFormOpen(true);
  }

  async function handleOpenAttachment(path: string) {
    const url = await externalInvoiceService.signedAttachmentUrl(path);
    if (!url) {
      toast.error("Could not generate download link");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(inv: ExternalInvoice) {
    if (!user?.id || !company?.id) return;
    if (!confirm(`Delete this invoice (${formatCurrency(inv.totalPence / 100)})?`)) {
      return;
    }
    try {
      await externalInvoiceService.delete(inv.id, user.id, company.id);
      setRows((curr) => (curr ?? []).filter((r) => r.id !== inv.id));
      toast.success("Invoice deleted");
    } catch (err) {
      const obj = err as { message?: string };
      toast.error(obj?.message ?? "Could not delete invoice");
    }
  }

  return (
    <Panel
      title="External invoices"
      subtitle="Auction-purchase + external-job spend logged against this vehicle"
      action={
        canCreate ? (
          <div className="flex gap-2">
            <Button icon="PlusMinor" onClick={() => openNew("auction_purchase")}>
              Add purchase
            </Button>
            <Button icon="PlusMinor" onClick={() => openNew("external_job")}>
              Add external job
            </Button>
          </div>
        ) : (
          <Pill tone="info">{formatCurrency(grandTotal / 100)}</Pill>
        )
      }
      flush
    >
      {/* Summary tiles */}
      <div className="grid gap-3 px-4 pb-3 @xl:grid-cols-3">
        <InvoiceStat
          icon={Gavel}
          label="Auction purchase"
          total={totalsByKind.auction_purchase}
          count={(rows ?? []).filter((r) => r.invoiceKind === "auction_purchase").length}
        />
        <InvoiceStat
          icon={Wrench}
          label="External jobs"
          total={totalsByKind.external_job}
          count={(rows ?? []).filter((r) => r.invoiceKind === "external_job").length}
        />
        <InvoiceStat
          icon={Receipt}
          label="Total logged"
          total={grandTotal}
          count={(rows ?? []).length}
          accent
        />
      </div>

      {/* Rows */}
      <div className="divide-y divide-(--border-secondary) border-t border-(--border-secondary)">
        {rows === null ? (
          <>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-9 w-9 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </>
        ) : rows.length === 0 ? (
          <div className="px-4 py-4 body-sm text-(--text-secondary)">
            No external invoices logged yet, use{" "}
            <span className="body-sm-semibold text-(--text)">Add purchase</span> or{" "}
            <span className="body-sm-semibold text-(--text)">Add external job</span> above to add one.
          </div>
        ) : (
          rows.map((r) => {
            const vendor = vendorById.get(r.vendorId);
            const isImage = (r.attachmentMimeType ?? "").startsWith("image/");
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                {/* Kind chip */}
                <Badge
                  tone={r.invoiceKind === "auction_purchase" ? "attention" : "neutral"}
                  className="shrink-0"
                >
                  {INVOICE_KIND_LABELS[r.invoiceKind]}
                </Badge>
                {/* Attachment thumbnail */}
                <span
                  className="shrink-0"
                  title={r.attachmentUrl ? "Open attachment" : "No attachment"}
                >
                  <Button
                    size="large"
                    disabled={!r.attachmentUrl}
                    onClick={() =>
                      r.attachmentUrl && handleOpenAttachment(r.attachmentUrl)
                    }
                    accessibilityLabel="Open attachment"
                    icon={
                      r.attachmentUrl ? (
                        isImage ? (
                          <ImageIcon className="size-4" />
                        ) : (
                          <FileText className="size-4" />
                        )
                      ) : (
                        <Paperclip className="size-4" />
                      )
                    }
                  />
                </span>
                {/* Description + vendor */}
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 body-md-semibold">
                    {r.description}
                  </div>
                  <div className="body-sm text-(--text-secondary)">
                    {vendor?.name ?? "Unknown vendor"} ·{" "}
                    {formatDate(r.invoiceDate)}
                    {r.invoiceNumber ? ` · #${r.invoiceNumber}` : null}
                  </div>
                </div>
                {/* Total */}
                <div className="text-right body-md-numeric">
                  <div className="body-md-semibold tabular-nums">
                    {formatCurrency(r.totalPence / 100)}
                  </div>
                  {r.vatPence > 0 ? (
                    <div className="body-sm text-(--text-secondary)">
                      incl. VAT {formatCurrency(r.vatPence / 100)}
                    </div>
                  ) : null}
                </div>
                {/* Actions */}
                <div className="ml-2 flex shrink-0 items-center gap-1">
                  {canEditAny ? (
                    <Button
                      variant="tertiary"
                      onClick={() => {
                        setEditing(r);
                        setDefaultKind(r.invoiceKind);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      variant="tertiary"
                      tone="critical"
                      icon="DeleteMinor"
                      accessibilityLabel="Delete"
                      onClick={() => handleDelete(r)}
                    />
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ExternalInvoiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultKind={defaultKind}
        fixedVehicleId={vehicleId}
        editing={editing}
        onSaved={() => {
          setEditing(null);
          setRefreshTick((t) => t + 1);
        }}
      />
    </Panel>
  );
}

function InvoiceStat({
  icon: Icon,
  label,
  total,
  count,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  total: number;
  count: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-(--radius-300) border border-(--border) bg-(--bg-surface) p-4",
        accent && "bg-(--bg-surface-secondary)",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="body-sm text-(--text-secondary)">{label}</span>
        <Icon className="size-4 text-(--icon-secondary)" />
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">
        {formatCurrency(total / 100)}
      </div>
      <div className="body-xs text-(--text-secondary)">

        {count} invoice{count === 1 ? "" : "s"}
      </div>
    </div>
  );
}
