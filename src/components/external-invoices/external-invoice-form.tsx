"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import {
  Button,
  ChoiceList,
  Labelled,
  Select,
  TextField,
} from "@/components/polaris";
import { Input } from "@/components/ui/input";
// Stays on the app Dialog: it hosts the VehiclePicker combobox popup and the
// nested "Add new vendor" dialog, which both need the app overlay stack.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog";
import { RegPlate } from "@/components/shared/reg-plate";
import { VehiclePicker } from "@/components/shared/vehicle-picker";
import { useAuth } from "@/contexts/auth-context";
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
import { SPECIALITY_LABELS, VendorInlineAdd } from "./vendor-inline-add";
import { AttachmentUploader } from "./attachment-uploader";

const KIND_CHOICES = (["auction_purchase", "external_job"] as InvoiceKind[]).map(
  (k) => ({ label: INVOICE_KIND_LABELS[k], value: k }),
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Default kind for the form (the active tab when "+ New" is clicked). */
  defaultKind: InvoiceKind;
  /** When set, the form pre-selects this vehicle and locks the picker. */
  fixedVehicleId?: UUID;
  /** When set, the form edits this row instead of creating. */
  editing?: ExternalInvoice | null;
  onSaved?: (inv: ExternalInvoice) => void;
}

function poundsToPence(s: string): number {
  if (!s) return 0;
  const n = Number(s.replace(/[£,\s]/g, ""));
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function penceToPounds(p: number | null | undefined): string {
  if (p == null) return "";
  return (p / 100).toFixed(2);
}

/**
 * Spec v3.0 · Module D.3 / 4 — external invoice form (covers both
 * auction-purchase and external-job kinds).
 *
 * Vendor + Vehicle pickers are searchable selects. Total + VAT are
 * currency inputs in pounds; Pre-VAT computes live (read-only). Cannot
 * submit if VAT > Total. Attachment slot uploads to Supabase Storage
 * via `externalInvoiceService.uploadAttachment` and stores the path.
 */
export function ExternalInvoiceForm({
  open,
  onOpenChange,
  defaultKind,
  fixedVehicleId,
  editing,
  onSaved,
}: Props) {
  const baseId = useId();
  const vendorFieldId = `${baseId}-vendor`;
  const previousOwnerFieldId = `${baseId}-previous-owner`;
  const serviceHistoryRefFieldId = `${baseId}-service-history-ref`;
  const vehicleFieldId = `${baseId}-vehicle`;
  const invoiceNumberFieldId = `${baseId}-invoice-number`;
  const invoiceDateFieldId = `${baseId}-invoice-date`;
  const totalFieldId = `${baseId}-total`;
  const vatFieldId = `${baseId}-vat`;
  const preVatFieldId = `${baseId}-pre-vat`;
  const descriptionFieldId = `${baseId}-description`;
  const notesFieldId = `${baseId}-notes`;
  const { company, user } = useAuth();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [kind, setKind] = useState<InvoiceKind>(defaultKind);
  const [vendorId, setVendorId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>(fixedVehicleId ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [total, setTotal] = useState("");
  const [vat, setVat] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [previousOwner, setPreviousOwner] = useState("");
  const [serviceHistoryRef, setServiceHistoryRef] = useState("");
  const [attachment, setAttachment] = useState<{
    path: string | null;
    filename: string | null;
    sizeBytes: number | null;
    mimeType: string | null;
  }>({ path: null, filename: null, sizeBytes: null, mimeType: null });
  const [submitting, setSubmitting] = useState(false);

  // F-D3 — paths uploaded in this dialog session that are NOT yet persisted
  // to the DB. On dialog close without save (or on attachment replace), we
  // purge them from Storage so we don't leak orphans. The baseline (the
  // attachment that already lives on the `editing` row) is preserved here so
  // we know not to delete it on Cancel.
  const persistedBaselineRef = useRef<string | null>(null);
  const draftPathsRef = useRef<Set<string>>(new Set());

  // Load lookups once when the dialog opens.
  useEffect(() => {
    if (!open || !company?.id) return;
    let cancelled = false;
    void Promise.all([
      vendorService.getAll(company.id),
      vehicleService.getAll(company.id),
    ]).then(([v, veh]) => {
      if (cancelled) return;
      setVendors(v.filter((x) => x.active));
      setVehicles(veh);
    });
    return () => {
      cancelled = true;
    };
  }, [open, company?.id]);

  // Populate form from `editing` when re-opening for an existing row.
  // setState-in-effect is the documented React pattern for "sync to external
  // prop on open" — the rule is silenced for this block intentionally.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    draftPathsRef.current = new Set();
    if (editing) {
      persistedBaselineRef.current = editing.attachmentUrl ?? null;
      setKind(editing.invoiceKind);
      setVendorId(editing.vendorId);
      setVehicleId(editing.vehicleId);
      setInvoiceNumber(editing.invoiceNumber ?? "");
      setInvoiceDate(editing.invoiceDate.slice(0, 10));
      setTotal(penceToPounds(editing.totalPence));
      setVat(penceToPounds(editing.vatPence));
      setDescription(editing.description);
      setNotes(editing.notes ?? "");
      setPreviousOwner(editing.previousOwner ?? "");
      setServiceHistoryRef(editing.serviceHistoryRef ?? "");
      setAttachment({
        path: editing.attachmentUrl,
        filename: editing.attachmentFilename,
        sizeBytes: editing.attachmentSizeBytes,
        mimeType: editing.attachmentMimeType,
      });
    } else {
      // Fresh form — reset everything (preserve fixedVehicleId).
      persistedBaselineRef.current = null;
      setKind(defaultKind);
      setVendorId("");
      setVehicleId(fixedVehicleId ?? "");
      setInvoiceNumber("");
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setTotal("");
      setVat("");
      setDescription("");
      setNotes("");
      setPreviousOwner("");
      setServiceHistoryRef("");
      setAttachment({
        path: null,
        filename: null,
        sizeBytes: null,
        mimeType: null,
      });
    }
  }, [open, editing, defaultKind, fixedVehicleId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId],
  );

  const totalPence = useMemo(() => poundsToPence(total), [total]);
  const vatPence = useMemo(() => poundsToPence(vat), [vat]);
  const preVatPence = Math.max(0, totalPence - vatPence);
  const vatExceedsTotal = vatPence > totalPence && totalPence > 0;

  const valid =
    !!vendorId &&
    !!vehicleId &&
    !!invoiceDate &&
    totalPence > 0 &&
    !vatExceedsTotal &&
    description.trim().length > 0;

  /**
   * F-D3: wrap the AttachmentUploader's onChange so that:
   *  - every uploaded path is registered as a draft (cleanup-on-cancel target)
   *  - if the user replaces or clears an attachment that was a draft (i.e.
   *    uploaded in this session, not yet saved), purge it immediately so we
   *    don't leak orphans even mid-session.
   *  - the persisted baseline (the attachment that lives on `editing`) is
   *    NEVER auto-deleted — that's the responsibility of the service's
   *    update() path, which runs on save.
   */
  function handleAttachmentChange(next: typeof attachment) {
    const prevPath = attachment.path;
    if (
      prevPath &&
      prevPath !== next.path &&
      prevPath !== persistedBaselineRef.current
    ) {
      // The path we are about to overwrite was a draft → purge it now.
      void externalInvoiceService.removeAttachmentObject(prevPath);
      draftPathsRef.current.delete(prevPath);
    }
    if (next.path && next.path !== persistedBaselineRef.current) {
      draftPathsRef.current.add(next.path);
    }
    setAttachment(next);
  }

  /**
   * F-D3: when the dialog closes without a successful save, every entry in
   * `draftPathsRef` is an uploaded-but-unreferenced Storage object. Best-
   * effort delete each one. Called from both the Cancel button and the
   * native dialog dismiss handler.
   */
  function purgeDrafts() {
    for (const path of draftPathsRef.current) {
      if (path && path !== persistedBaselineRef.current) {
        void externalInvoiceService.removeAttachmentObject(path);
      }
    }
    draftPathsRef.current = new Set();
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      purgeDrafts();
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    if (!company?.id || !user?.id || !valid) return;
    setSubmitting(true);
    try {
      const payload = {
        invoiceKind: kind,
        invoiceNumber: invoiceNumber.trim() || null,
        vendorId,
        vehicleId,
        invoiceDate,
        totalPence,
        vatPence,
        description: description.trim(),
        notes: notes.trim() || null,
        previousOwner:
          kind === "auction_purchase" ? previousOwner.trim() || null : null,
        serviceHistoryRef:
          kind === "auction_purchase" ? serviceHistoryRef.trim() || null : null,
        attachmentUrl: attachment.path,
        attachmentFilename: attachment.filename,
        attachmentSizeBytes: attachment.sizeBytes,
        attachmentMimeType: attachment.mimeType,
      };
      let saved: ExternalInvoice;
      if (editing) {
        saved = await externalInvoiceService.update(
          editing.id,
          payload,
          user.id,
          company.id,
        );
        toast.success("Invoice updated");
      } else {
        saved = await externalInvoiceService.create(company.id, payload, user.id);
        toast.success("Invoice saved");
      }
      // F-D3 — the attachment (if any) is now persisted; remove from drafts
      // so the close handler doesn't try to delete it.
      draftPathsRef.current = new Set();
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      const obj = err as { message?: string; hint?: string; details?: string };
      toast.error(
        obj?.message ?? obj?.hint ?? obj?.details ?? "Could not save invoice",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!company?.id || !user?.id) return null;

  const vendorOptions = vendors.map((v) => ({
    value: v.id,
    label: `${v.name} · ${SPECIALITY_LABELS[v.speciality] ?? v.speciality}`,
  }));

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit invoice" : "New invoice"}
          </DialogTitle>
          <DialogDescription>
            Records an inbound invoice the dealership has received.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel className="grid gap-4">
          <ChoiceList
            title="Kind"
            choices={KIND_CHOICES}
            selected={[kind]}
            onChange={(next) => {
              if (next[0]) setKind(next[0] as InvoiceKind);
            }}
          />

          {/* Vendor + inline add */}
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Select
                id={vendorFieldId}
                // Select has no requiredIndicator; match the other fields' " *".
                label="Vendor *"
                placeholder="Pick a vendor"
                options={vendorOptions}
                value={vendorId}
                onChange={setVendorId}
              />
            </div>
            <VendorInlineAdd
              companyId={company.id}
              existingVendors={vendors}
              onCreated={(v) => {
                setVendors((curr) =>
                  curr.some((x) => x.id === v.id) ? curr : [...curr, v],
                );
                setVendorId(v.id);
              }}
            />
          </div>

          {/* Auction-specific details — only meaningful for an auction purchase */}
          {kind === "auction_purchase" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                id={previousOwnerFieldId}
                label="Previous owner"
                value={previousOwner}
                onChange={setPreviousOwner}
                placeholder="If disclosed by the auction house"
              />
              <TextField
                id={serviceHistoryRefFieldId}
                label="Service history reference"
                value={serviceHistoryRef}
                onChange={setServiceHistoryRef}
                placeholder="Booklet / pack reference"
              />
            </div>
          )}

          {/* Vehicle — read-only chip when locked to one car, else a picker */}
          <Labelled id={vehicleFieldId} label="Vehicle" requiredIndicator>
            {fixedVehicleId ? (
              <div className="flex items-center gap-2.5 rounded-(--radius-200) border border-(--border) bg-(--bg-surface-secondary) px-3 py-2">
                {selectedVehicle ? (
                  <>
                    <RegPlate registration={selectedVehicle.registration} size="sm" />
                    <span className="text-sm font-medium">
                      {selectedVehicle.make} {selectedVehicle.model}
                    </span>
                    <span className="text-xs text-(--text-secondary)">
                      · {selectedVehicle.stockId}
                    </span>
                    <span className="ml-auto text-xs font-medium text-(--text-secondary)">
                      Locked
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-(--text-secondary)">
                    Loading vehicle…
                  </span>
                )}
              </div>
            ) : (
              // Stock runs past a hundred cars, so a scrolling dropdown is a
              // hunt for a plate the user already knows (GEN-79).
              <VehiclePicker
                id={vehicleFieldId}
                vehicles={vehicles}
                value={selectedVehicle}
                onChange={(v) => setVehicleId(v?.id ?? "")}
              />
            )}
          </Labelled>

          {/* Invoice number + date */}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id={invoiceNumberFieldId}
              label="Invoice number"
              value={invoiceNumber}
              onChange={setInvoiceNumber}
              placeholder="Vendor's reference"
            />
            <Labelled
              id={invoiceDateFieldId}
              label="Invoice date"
              requiredIndicator
            >
              <Input
                id={invoiceDateFieldId}
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </Labelled>
          </div>

          {/* Money trio */}
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              id={totalFieldId}
              label="Total (inc. VAT)"
              requiredIndicator
              prefix="£"
              inputMode="decimal"
              value={total}
              onChange={setTotal}
              placeholder="0.00"
            />
            <TextField
              id={vatFieldId}
              label="VAT"
              prefix="£"
              inputMode="decimal"
              value={vat}
              onChange={setVat}
              placeholder="0.00"
              error={vatExceedsTotal ? "VAT can't exceed the total" : undefined}
            />
            <TextField
              id={preVatFieldId}
              label="Pre-VAT (auto)"
              prefix="£"
              value={penceToPounds(preVatPence)}
              readOnly
            />
          </div>

          <TextField
            id={descriptionFieldId}
            label="Description"
            requiredIndicator
            multiline={3}
            value={description}
            onChange={setDescription}
            placeholder="What was the job / what was purchased?"
          />

          <TextField
            id={notesFieldId}
            label="Notes (optional)"
            multiline={2}
            value={notes}
            onChange={setNotes}
          />

          {/* Attachment */}
          <div className="grid gap-1">
            <p className="text-sm font-medium text-(--text)">
              Attachment (optional)
            </p>
            <AttachmentUploader
              companyId={company.id}
              vehicleId={vehicleId || null}
              value={attachment}
              onChange={handleAttachmentChange}
              disabled={submitting}
            />
          </div>
        </DialogPanel>

        <DialogFooter>
          <Button
            onClick={() => handleDialogOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSubmit()}
            disabled={!valid}
            loading={submitting}
          >
            {editing ? "Save changes" : "Save invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
