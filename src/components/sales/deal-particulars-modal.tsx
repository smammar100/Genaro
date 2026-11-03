"use client";

import { useEffect, useState } from "react";
import { Banner, Modal, TextField } from "@/components/genaro";
import type { DealParticulars } from "@/lib/services/sales-service";
import type { SalesDeal } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

/** The deal's figures and dates, as the deal page shows and edits them. */
export type DealParticularsValue = Pick<
  SalesDeal,
  "agreedPrice" | "depositAmount" | "depositDate" | "collectionDate"
> & { viewingDate: string | null };

export interface DealParticularsModalProps {
  open: boolean;
  customerName: string;
  value: DealParticularsValue;
  onClose: () => void;
  /** Saves what changed. A throw keeps the dialog open with the message. */
  onSave: (patch: DealParticulars & { viewingDate?: string | null }) => Promise<void>;
}

interface Form {
  agreedPrice: string;
  depositAmount: string;
  depositDate: string;
  viewingDate: string;
  collectionDate: string;
}

/** "£12,995.50" → 12995.5, "" → null, and undefined when it isn't a number. */
function parseMoney(text: string): number | null | undefined {
  const cleaned = text.replace(/[£,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

const text = (n: number | null) => (n == null ? "" : String(n));

/** What is left to pay: the agreed price less the deposit; null without a price. */
export function balanceDue(agreedPrice: number | null, depositAmount: number | null): number | null {
  if (agreedPrice == null) return null;
  return agreedPrice - (depositAmount ?? 0);
}

/**
 * Edits a deal's particulars from its page (bug list 2026-11-02, item 4): the
 * agreed total price, the deposit paid and when, the viewing date and the
 * collection date. The balance due is worked out from the price and deposit,
 * so it can't disagree with them.
 * @import import { DealParticularsModal } from "@/components/sales/deal-particulars-modal";
 */
export function DealParticularsModal({ open, customerName, value, onClose, onSave }: DealParticularsModalProps) {
  const [form, setForm] = useState<Form>({
    agreedPrice: "",
    depositAmount: "",
    depositDate: "",
    viewingDate: "",
    collectionDate: "",
  });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each opening starts from the deal as saved.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      agreedPrice: text(value.agreedPrice),
      depositAmount: text(value.depositAmount),
      depositDate: value.depositDate ?? "",
      viewingDate: value.viewingDate ?? "",
      collectionDate: value.collectionDate ?? "",
    });
    setTouched(false);
    setError(null);
  }, [open, value]);

  const set = <K extends keyof Form>(field: K, v: Form[K]) => setForm((f) => ({ ...f, [field]: v }));

  const agreed = parseMoney(form.agreedPrice);
  const deposit = parseMoney(form.depositAmount);
  const problems = {
    agreedPrice: agreed === undefined ? "Enter a price, or leave it blank." : null,
    depositAmount:
      deposit === undefined
        ? "Enter the deposit, or leave it blank."
        : deposit != null && agreed != null && deposit > agreed
          ? "The deposit is more than the agreed price."
          : null,
  };
  const show = (field: keyof typeof problems) => (touched ? (problems[field] ?? undefined) : undefined);
  const balance = balanceDue(agreed ?? null, deposit ?? null);

  async function save() {
    setTouched(true);
    if (Object.values(problems).some(Boolean) || agreed === undefined || deposit === undefined) return;
    const patch: DealParticulars & { viewingDate?: string | null } = {};
    if (agreed !== value.agreedPrice) patch.agreedPrice = agreed;
    if (deposit !== value.depositAmount) patch.depositAmount = deposit;
    const depositDate = form.depositDate || null;
    if (depositDate !== value.depositDate) patch.depositDate = depositDate;
    const collectionDate = form.collectionDate || null;
    if (collectionDate !== value.collectionDate) patch.collectionDate = collectionDate;
    const viewingDate = form.viewingDate || null;
    if (viewingDate !== value.viewingDate) patch.viewingDate = viewingDate;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(patch);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the deal.");
    } finally {
      setSaving(false);
    }
  }

  const close = () => {
    if (!saving) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Edit ${customerName}'s deal`}
      primaryAction={{ content: "Save deal", loading: saving, onAction: () => void save() }}
      secondaryActions={[{ content: "Cancel", onAction: close }]}
    >
      <div className="flex flex-col gap-4">
        {error ? <Banner tone="critical">{error}</Banner> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Agreed total price"
            prefix="£"
            inputMode="decimal"
            value={form.agreedPrice}
            onChange={(v) => set("agreedPrice", v)}
            error={show("agreedPrice")}
          />
          <TextField
            label="Balance due"
            prefix="£"
            readOnly
            value={balance == null ? "" : formatCurrency(balance).replace("£", "")}
            helpText="Agreed price less the deposit."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Deposit paid"
            prefix="£"
            inputMode="decimal"
            value={form.depositAmount}
            onChange={(v) => set("depositAmount", v)}
            error={show("depositAmount")}
          />
          <TextField
            label="Deposit date"
            type="date"
            value={form.depositDate}
            onChange={(v) => set("depositDate", v)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Date of viewing"
            type="date"
            value={form.viewingDate}
            onChange={(v) => set("viewingDate", v)}
          />
          <TextField
            label="Date of collection"
            type="date"
            value={form.collectionDate}
            onChange={(v) => set("collectionDate", v)}
          />
        </div>
      </div>
    </Modal>
  );
}
