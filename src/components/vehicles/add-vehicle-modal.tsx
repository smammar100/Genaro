"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, TextField } from "@/components/polaris";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preserved through to the arrival form (e.g. a dealer-partner pre-pick). */
  extraParams?: Record<string, string>;
}

/**
 * Add Vehicle pre-entry modal. Captures registration + mileage up front so the
 * arrival form can run the DVLA + AutoTrader lookup in one shot. "Continue
 * manually" skips the lookup and opens a blank form.
 */
export function AddVehicleModal({ open, onOpenChange, extraParams }: Props) {
  const router = useRouter();
  const regId = useId();
  const mileageId = useId();
  const [reg, setReg] = useState("");
  const [mileage, setMileage] = useState("");
  const [navigating, setNavigating] = useState(false);

  const cleanedReg = reg.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const canLookup = cleanedReg.length >= 4 && cleanedReg.length <= 8;

  // The Modal focuses its dialog on open; start the user in the reg field.
  // (Parent effects run after the Modal's, so this focus wins.)
  useEffect(() => {
    if (open) document.getElementById(regId)?.focus();
  }, [open, regId]);

  function reset() {
    setReg("");
    setMileage("");
    setNavigating(false);
  }

  function close() {
    reset();
    onOpenChange(false);
  }

  function go(withLookup: boolean) {
    if (withLookup && !canLookup) {
      document.getElementById(regId)?.focus();
      return;
    }
    const params = new URLSearchParams(extraParams ?? {});
    if (withLookup) {
      params.set("reg", cleanedReg);
      const m = Number(mileage);
      if (Number.isFinite(m) && m > 0)
        params.set("mileage", String(Math.round(m)));
    }
    const qs = params.toString();
    setNavigating(true);
    router.push(`/inventory/add-vehicle${qs ? `?${qs}` : ""}`);
    // Close after kicking off navigation (also resets state for a clean re-open).
    close();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a vehicle"
      primaryAction={{
        content: "Look up and continue",
        onAction: () => go(true),
        loading: navigating,
      }}
      secondaryActions={[
        { content: "Continue manually", onAction: () => go(false) },
      ]}
    >
      <div
        className="flex flex-col gap-4"
        // Enter in either field runs the lookup, as the primary action does.
        onKeyDown={(e) => {
          if (e.key === "Enter" && canLookup) go(true);
        }}
      >
        <p className="text-sm text-(--text-secondary)">
          Start a new stock record, look it up automatically or enter it by
          hand. Enter the registration and mileage; we&apos;ll pull make,
          model, derivative, tax, MOT and an AutoTrader valuation
          automatically.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id={regId}
            label="Registration"
            value={reg}
            onChange={(v) => setReg(v.toUpperCase())}
            placeholder="EK18 FUT"
            autoComplete="off"
          />
          <TextField
            id={mileageId}
            label="Mileage"
            type="number"
            inputMode="numeric"
            value={mileage}
            onChange={setMileage}
            placeholder="e.g. 45000"
            helpText="Needed for an accurate AutoTrader valuation."
          />
        </div>
      </div>
    </Modal>
  );
}
