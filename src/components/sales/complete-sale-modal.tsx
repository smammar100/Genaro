"use client";

import { useEffect, useState } from "react";
import { Banner, Modal, Select, TextField } from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { isValueAdditionLocked } from "@/lib/master-sheet";
import type { SaleDetails } from "@/lib/services/sales-service";
import type { Vehicle } from "@/lib/types";

export interface CompleteSaleModalProps {
  /** The deal being completed; the dialog is open while it is set. */
  open: boolean;
  customerName: string;
  vehicle: Pick<Vehicle, "registration" | "make" | "model" | "valueAddition" | "legacySerialNumber"> | null;
  /** The won stage's name, "Completed sale" unless renamed. */
  stageLabel: string;
  /** Starting price: the deal's agreed or offered price, else the car's. */
  defaultPrice: number | null;
  /** Starting enquiry source, from the lead's channel. */
  defaultSource: string | null;
  /** What the enquiry source can be (the master sheet's wording). */
  sourceOptions: string[];
  onClose: () => void;
  /** Saves the sale. A throw keeps the dialog open with the message. */
  onConfirm: (sale: SaleDetails) => Promise<void>;
}

interface Form {
  dateSold: string;
  sellingPrice: string;
  enquirySource: string;
  valueAddition: string;
}

const today = () => new Date().toLocaleDateString("en-CA");

/** "£12,995.50" → 12995.5; null when it isn't a number. */
function parseMoney(text: string): number | null {
  const cleaned = text.replace(/[£,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const money = (n: number | null): string => (n == null ? "" : String(n));

/**
 * Completing a sale (bug list 2026-11-02, item 2). Asks for the four things
 * the master sheet records about it: the date, the price, where the buyer
 * came from and the value added to the car. Saving moves the deal to the won
 * stage and writes them onto the car's row, marking it SOLD.
 * @import import { CompleteSaleModal } from "@/components/sales/complete-sale-modal";
 */
export function CompleteSaleModal({
  open,
  customerName,
  vehicle,
  stageLabel,
  defaultPrice,
  defaultSource,
  sourceOptions,
  onClose,
  onConfirm,
}: CompleteSaleModalProps) {
  const [form, setForm] = useState<Form>({ dateSold: "", sellingPrice: "", enquirySource: "", valueAddition: "" });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each opening starts from the deal as it is now.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      dateSold: today(),
      sellingPrice: money(defaultPrice),
      enquirySource: defaultSource ?? "",
      valueAddition: money(vehicle?.valueAddition ?? 0),
    });
    setTouched(false);
    setError(null);
  }, [open, defaultPrice, defaultSource, vehicle?.valueAddition]);

  const set = <K extends keyof Form>(field: K, value: Form[K]) => setForm((f) => ({ ...f, [field]: value }));

  const price = parseMoney(form.sellingPrice);
  const valueAddition = parseMoney(form.valueAddition);
  const problems = {
    dateSold: /^\d{4}-\d{2}-\d{2}$/.test(form.dateSold) ? null : "Enter the date of sale.",
    sellingPrice: price !== null && price > 0 ? null : "Enter the price it sold for.",
    enquirySource: form.enquirySource.trim() ? null : "Pick where the buyer came from.",
    valueAddition: valueAddition !== null && valueAddition >= 0 ? null : "Enter the value addition, or 0.",
  };
  const show = (field: keyof typeof problems) => (touched ? (problems[field] ?? undefined) : undefined);

  async function save() {
    setTouched(true);
    if (Object.values(problems).some(Boolean) || price === null || valueAddition === null) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm({
        dateSold: form.dateSold,
        sellingPrice: price,
        enquirySource: form.enquirySource.trim(),
        valueAddition,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't complete the sale.");
    } finally {
      setSaving(false);
    }
  }

  const close = () => {
    if (!saving) onClose();
  };
  const car = vehicle ? `${vehicle.make} ${vehicle.model}` : "the car";
  const fromTodos = vehicle ? !isValueAdditionLocked(vehicle) : false;

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Mark ${vehicle?.registration ?? "the car"} as sold?`}
      primaryAction={{ content: "Mark as sold", loading: saving, onAction: () => void save() }}
      secondaryActions={[{ content: "Cancel", onAction: close }]}
    >
      <div className="flex flex-col gap-4">
        {error ? <Banner tone="critical">{error}</Banner> : null}
        <div className="flex flex-wrap items-center gap-2">
          {vehicle ? <RegPlate registration={vehicle.registration} size="sm" /> : null}
          <p className="body-md min-w-0 text-(--text-secondary)">
            {customerName}&apos;s deal moves to {stageLabel}, and the {car} is marked sold on the master sheet with
            these details.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Date of sale"
            type="date"
            requiredIndicator
            value={form.dateSold}
            onChange={(v) => set("dateSold", v)}
            error={show("dateSold")}
          />
          <TextField
            label="Sales price"
            prefix="£"
            inputMode="decimal"
            requiredIndicator
            value={form.sellingPrice}
            onChange={(v) => set("sellingPrice", v)}
            error={show("sellingPrice")}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Enquiry source"
            placeholder="Where did the buyer come from?"
            options={sourceOptions}
            value={form.enquirySource}
            onChange={(v) => set("enquirySource", v)}
            error={show("enquirySource")}
          />
          <TextField
            label="Value addition"
            prefix="£"
            inputMode="decimal"
            requiredIndicator
            value={form.valueAddition}
            onChange={(v) => set("valueAddition", v)}
            error={show("valueAddition")}
            helpText={fromTodos ? "The total of this car's Things to Do. Change it only if that total is wrong." : undefined}
          />
        </div>
      </div>
    </Modal>
  );
}
