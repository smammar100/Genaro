"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import {
  Banner,
  Labelled,
  Modal,
  Select,
  TextField,
} from "@/components/polaris";
import { Input } from "@/components/ui/input";
import {
  VEHICLE_LOCATION_LABELS,
  VEHICLE_LOCATIONS,
  type LocationMovement,
  type UUID,
  type VehicleLocation,
} from "@/lib/types";
import { locationService } from "@/lib/services/location-service";
import { validateMovementEdit } from "@/lib/location-history";

interface MovementEditDialogProps {
  /** The movement being corrected; null closes the dialog. */
  movement: LocationMovement | null;
  /** Full history, needed to enforce chronology against neighbours. */
  movements: LocationMovement[];
  onOpenChange: (open: boolean) => void;
  actorId: UUID;
  companyId: UUID;
  onSaved: () => void;
}

/** ISO timestamp → the `YYYY-MM-DDTHH:mm` a datetime-local input expects. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** Local input value → ISO, or null when cleared. */
function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Correct a historical location movement (GEN-101).
 *
 * Movements were previously append-only, so a car logged to the wrong garage
 * or on the wrong day stayed wrong forever. Editing is chronology-checked —
 * a movement cannot be dragged past its neighbours, because the order of the
 * timeline *is* the vehicle's history.
 */
export function MovementEditDialog({
  movement,
  movements,
  onOpenChange,
  actorId,
  companyId,
  onSaved,
}: MovementEditDialogProps) {
  if (!movement) return null;
  // Keyed on the movement so opening a different one remounts the form with
  // fresh initial state, rather than syncing it back through an effect.
  return (
    <MovementEditForm
      key={movement.id}
      movement={movement}
      movements={movements}
      onOpenChange={onOpenChange}
      actorId={actorId}
      companyId={companyId}
      onSaved={onSaved}
    />
  );
}

function MovementEditForm({
  movement,
  movements,
  onOpenChange,
  actorId,
  companyId,
  onSaved,
}: MovementEditDialogProps & { movement: LocationMovement }) {
  const [toLocation, setToLocation] = useState<VehicleLocation>(
    movement.toLocation,
  );
  const [movedAt, setMovedAt] = useState(() => toLocalInput(movement.createdAt));
  const [expectedReturn, setExpectedReturn] = useState(() =>
    toLocalInput(movement.expectedReturnAt),
  );
  const [actualReturn, setActualReturn] = useState(() =>
    toLocalInput(movement.actualReturnAt),
  );
  const [notes, setNotes] = useState(movement.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isStay = toLocation === "garage" || toLocation === "staff";

  async function handleSave() {
    const patch = {
      toLocation,
      createdAt: fromLocalInput(movedAt) ?? movement.createdAt,
      expectedReturnAt: fromLocalInput(expectedReturn),
      actualReturnAt: fromLocalInput(actualReturn),
      notes: notes.trim() === "" ? null : notes.trim(),
    };

    const problem = validateMovementEdit(movements, movement.id, patch);
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    try {
      await locationService.updateMovement(movement.id, patch, actorId, companyId);
      toast.success("Movement updated");
      onSaved();
      onOpenChange(false);
    } catch {
      setError("Could not save that change. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={movement !== null}
      onClose={() => onOpenChange(false)}
      title="Edit movement"
      primaryAction={{
        content: "Save changes",
        loading: saving,
        onAction: () => void handleSave(),
      }}
      secondaryActions={[
        { content: "Cancel", onAction: () => onOpenChange(false) },
      ]}
    >
      <div className="flex flex-col gap-4">
        <p className="body-md text-(--text-secondary)">
          Correct a movement recorded in error. The vehicle&apos;s current
          location is re-derived from the timeline after saving.
        </p>

        <Select
          id="movement-destination"
          label="Location"
          options={VEHICLE_LOCATIONS.map((l) => ({
            label: VEHICLE_LOCATION_LABELS[l],
            value: l,
          }))}
          value={toLocation}
          onChange={(v) => setToLocation(v as VehicleLocation)}
        />

        <Labelled id="movement-date" label="Moved at">
          <Input
            id="movement-date"
            type="datetime-local"
            aria-label="Moved at"
            value={movedAt}
            onChange={(e) => setMovedAt(e.target.value)}
          />
        </Labelled>

        {isStay && (
          <>
            <Labelled id="movement-expected" label="Expected back">
              <Input
                id="movement-expected"
                type="datetime-local"
                aria-label="Expected back"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(e.target.value)}
              />
            </Labelled>
            <Labelled id="movement-actual" label="Returned at">
              <Input
                id="movement-actual"
                type="datetime-local"
                aria-label="Returned at"
                value={actualReturn}
                onChange={(e) => setActualReturn(e.target.value)}
              />
            </Labelled>
          </>
        )}

        <TextField
          id="movement-notes"
          label="Notes"
          multiline={3}
          value={notes}
          onChange={setNotes}
        />

        {error && <Banner tone="critical">{error}</Banner>}
      </div>
    </Modal>
  );
}
