"use client";

import { useId, useState } from "react";
import { Banner, Labelled, Modal } from "@/components/polaris";
import { VehiclePicker } from "@/components/shared/vehicle-picker";
import type { Vehicle } from "@/lib/types";

interface ChangeVehicleModalProps {
  open: boolean;
  onClose: () => void;
  /** Who the lead or deal is for, for the title. */
  customerName: string;
  /** The car it points at now; preselected, and saving it unchanged is a no-op. */
  current: Vehicle | null;
  /** Cars that can be picked: anything still in the business. */
  vehicles: Vehicle[];
  /** Saves the pick. A thrown error's message is shown in the modal. */
  onSave: (vehicle: Vehicle) => Promise<void>;
}

/**
 * Swap the car on a lead or a deal — the customer called about one car and is
 * buying another (call 2026-10-24).
 */
export function ChangeVehicleModal({
  open,
  onClose,
  customerName,
  current,
  vehicles,
  onSave,
}: ChangeVehicleModalProps) {
  const pickerId = useId();
  const [picked, setPicked] = useState<Vehicle | null>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from the current car each time the modal opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPicked(current);
      setError(null);
    }
  }

  async function save() {
    if (!picked) {
      setError("Pick a vehicle.");
      return;
    }
    if (picked.id === current?.id) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(picked);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't change the vehicle.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={`Change vehicle for ${customerName}`}
      primaryAction={{ content: "Change vehicle", loading: saving, onAction: () => void save() }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: () => {
            if (!saving) onClose();
          },
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <Labelled
          id={pickerId}
          label="Vehicle"
          helpText={
            current
              ? `Currently ${current.registration}, ${current.make} ${current.model}.`
              : "No vehicle linked yet."
          }
        >
          <VehiclePicker
            id={pickerId}
            vehicles={vehicles}
            value={picked}
            onChange={setPicked}
            placeholder="Search by reg, make or model"
          />
        </Labelled>
        {error ? <Banner tone="critical">{error}</Banner> : null}
      </div>
    </Modal>
  );
}
