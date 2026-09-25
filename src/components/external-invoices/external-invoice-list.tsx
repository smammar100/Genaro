"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { FileText, Image as ImageIcon, Paperclip } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  Button,
  Card,
  EmptyState,
  IndexTable,
  Link,
  Modal,
  Select,
  SkeletonBodyText,
  TextField,
} from "@/components/polaris";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { externalInvoiceService } from "@/lib/services/external-invoice-service";
import { vendorService } from "@/lib/services/vendor-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import type {
  ExternalInvoice,
  InvoiceKind,
  UUID,
  Vehicle,
  Vendor,
} from "@/lib/types";
import { INVOICE_KIND_LABELS } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { ExternalInvoiceForm } from "./external-invoice-form";

interface Props {
  kind: InvoiceKind;
}

/**
 * Spec v3.0 · Module D — list of external/purchase invoices for a
 * single kind tab. Toolbar (search + vendor filter + Add invoice),
 * table of rows, click attachment icon for signed-URL preview, Edit /
 * Delete actions gated by `external_invoice:*` caps.
 */
export function ExternalInvoiceList({ kind }: Props) {
  const pathname = usePathname();
  const { company, user } = useAuth();
  const { can, isSuperUser } = usePermissions();
  const canCreate = isSuperUser || can("external_invoice:create");
  const canEditAny = isSuperUser || can("external_invoice:edit_any");
  const canDelete = isSuperUser || can("external_invoice:delete");

  const [rows, setRows] = useState<ExternalInvoice[] | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState<UUID | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExternalInvoice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ExternalInvoice | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    void Promise.all([
      externalInvoiceService.getByKind(company.id, kind),
      vendorService.getAll(company.id),
      vehicleService.getAll(company.id),
    ]).then(([r, vd, vh]) => {
      if (cancelled) return;
      setRows(r);
      setVendors(vd);
      setVehicles(vh);
    });
    return () => {
      cancelled = true;
    };
  }, [company?.id, kind, formOpen]);

  const vendorById = useMemo(
    () => new Map(vendors.map((v) => [v.id, v])),
    [vendors],
  );
  const vendorOptions = useMemo(
    () => [
      { value: "all", label: "All vendors" },
      ...vendors.map((v) => ({ value: v.id, label: v.name })),
    ],
    [vendors],
  );
  const vehicleById = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v])),
    [vehicles],
  );

  const filtered = useMemo(() => {
    if (!rows) return null;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (vendorFilter !== "all" && r.vendorId !== vendorFilter) return false;
      if (!q) return true;
      const vendor = vendorById.get(r.vendorId)?.name ?? "";
      const veh = vehicleById.get(r.vehicleId);
      const vehStr = veh ? `${veh.stockId} ${veh.registration} ${veh.make} ${veh.model}` : "";
      return (
        vendor.toLowerCase().includes(q) ||
        vehStr.toLowerCase().includes(q) ||
        (r.invoiceNumber ?? "").toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    });
  }, [rows, search, vendorFilter, vendorById, vehicleById]);

  const kindLabel = INVOICE_KIND_LABELS[kind].toLowerCase();
  const isFiltered = search.trim() !== "" || vendorFilter !== "all";

  function openCreate() {
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
    setDeletingId(inv.id);
    try {
      await externalInvoiceService.delete(inv.id, user.id, company.id);
      setRows((curr) => (curr ?? []).filter((r) => r.id !== inv.id));
      toast.success("Invoice deleted");
      setConfirmDelete(null);
    } catch (err) {
      const obj = err as { message?: string };
      toast.error(obj?.message ?? "Could not delete invoice");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-64">
          <TextField
            label={`Search ${kindLabel} invoices`}
            labelHidden
            type="search"
            prefix="SearchMinor"
            value={search}
            onChange={setSearch}
            clearButton
            onClearButtonClick={() => setSearch("")}
            placeholder={`Search ${kindLabel}…`}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            label="Vendor"
            labelInline
            options={vendorOptions}
            value={vendorFilter}
            onChange={(v) => setVendorFilter(v as UUID | "all")}
          />
        </div>
        <div className="ml-auto">
          {canCreate ? (
            <Button variant="primary" icon="PlusMinor" onClick={openCreate}>
              Add invoice
            </Button>
          ) : null}
        </div>
      </div>

      {/* Same IndexTable anatomy as the invoice ledger on /admin/invoicing
          so the three tabs read as one page (GEN-46). */}
      {rows === null || filtered === null ? (
        <Card>
          <SkeletonBodyText lines={6} />
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          heading={
            isFiltered
              ? "No invoices match these filters"
              : `No ${kindLabel} invoices yet`
          }
          action={
            canCreate && !isFiltered
              ? { content: "Add invoice", onAction: openCreate }
              : undefined
          }
        >
          {isFiltered ? (
            "Try a different search or vendor."
          ) : kind === "auction_purchase" ? (
            // Supplier purchase docs uploaded to the ledger are a different
            // dataset — point there so an empty tab never reads as "the
            // company has no purchase invoices" (GEN-46).
            <>
              Uploaded supplier purchase invoices live under{" "}
              <Link url="/admin/invoicing">All invoices → Purchase</Link>.
            </>
          ) : null}
        </EmptyState>
      ) : (
        <IndexTable
          selectable={false}
          primaryColumn={1}
          headings={[
            { title: "Date" },
            { title: "Vendor" },
            { title: "Vehicle" },
            { title: "Invoice #" },
            { title: "Description" },
            { title: "Total", alignment: "end" },
            { title: "Actions", alignment: "end" },
          ]}
          rows={filtered.map((r) => {
            const vendor = vendorById.get(r.vendorId);
            const veh = vehicleById.get(r.vehicleId);
            return {
              id: r.id,
              cells: [
                <span key="date" className="tabular-nums">
                  {formatDate(r.invoiceDate)}
                </span>,
                vendor?.name ?? "—",
                veh ? (
                  <div key="vehicle" className="text-xs">
                    <Link
                      url={vehicleDetailHref(veh.id, pathname)}
                      monochrome
                      removeUnderline
                      className="font-medium"
                    >
                      {veh.stockId}
                    </Link>
                    <div className="text-(--text-secondary)">
                      {veh.registration}
                    </div>
                  </div>
                ) : (
                  "—"
                ),
                <span key="number" className="font-mono text-xs">
                  {r.invoiceNumber ?? "—"}
                </span>,
                <div
                  key="description"
                  className="line-clamp-2 max-w-md whitespace-normal"
                >
                  {r.description}
                </div>,
                formatCurrency(r.totalPence / 100),
                <div key="actions" className="inline-flex items-center gap-1">
                  {r.attachmentUrl ? (
                    <span title="View attachment" className="inline-flex">
                      <Button
                        variant="tertiary"
                        icon={
                          (r.attachmentMimeType ?? "").startsWith("image/") ? (
                            <ImageIcon />
                          ) : (
                            <FileText />
                          )
                        }
                        accessibilityLabel="View attachment"
                        onClick={() => void handleOpenAttachment(r.attachmentUrl!)}
                      />
                    </span>
                  ) : (
                    <span
                      title="No attachment"
                      className="inline-flex size-7 items-center justify-center text-(--icon-disabled)"
                    >
                      <Paperclip className="size-3.5" aria-hidden />
                    </span>
                  )}
                  {canEditAny ? (
                    <Button
                      variant="tertiary"
                      onClick={() => {
                        setEditing(r);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <span title="Delete" className="inline-flex">
                      <Button
                        variant="tertiary"
                        tone="critical"
                        icon="DeleteMinor"
                        accessibilityLabel="Delete invoice"
                        onClick={() => setConfirmDelete(r)}
                      />
                    </span>
                  ) : null}
                </div>,
              ],
            };
          })}
        />
      )}

      {rows && filtered ? (
        <div className="text-xs text-(--text-secondary)">
          {filtered.length} of {rows.length} invoice
          {rows.length === 1 ? "" : "s"}
          {isFiltered ? " (filtered)" : ""}
        </div>
      ) : null}

      {/* Delete confirmation */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => {
          if (!deletingId) setConfirmDelete(null);
        }}
        title="Delete this invoice?"
        size="small"
        primaryAction={{
          content: "Delete invoice",
          destructive: true,
          loading: deletingId !== null,
          onAction: () => {
            if (confirmDelete) void handleDelete(confirmDelete);
          },
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setConfirmDelete(null) },
        ]}
      >
        {confirmDelete ? (
          <p>
            The {formatCurrency(confirmDelete.totalPence / 100)} invoice
            {vendorById.get(confirmDelete.vendorId)
              ? ` from ${vendorById.get(confirmDelete.vendorId)!.name}`
              : ""}{" "}
            will be deleted. This can&apos;t be undone.
          </p>
        ) : null}
      </Modal>

      {/* Form dialog (Create / Edit) */}
      <ExternalInvoiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultKind={kind}
        editing={editing}
        onSaved={() => {
          // List re-fetches via the `formOpen` dep on the load effect.
          setEditing(null);
        }}
      />
    </div>
  );
}
