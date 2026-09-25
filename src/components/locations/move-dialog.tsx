"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import {
  ChoiceList,
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
  type User,
  type Vehicle,
  type VehicleLocation,
  type Vendor,
} from "@/lib/types";
import { locationService } from "@/lib/services/location-service";

interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle;
  vendors: Vendor[];
  users: User[];
  actorId: UUID;
  companyId: UUID;
  onSuccess?: (movement: LocationMovement) => void;
}

function plusHoursLocal(hours: number): string {
  // Default expected return = now + N hours, formatted for <input type="datetime-local">.
  const d = new Date(Date.now() + hours * 3600_000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * Move dialog (Spec v3.0 · Module A · Chunk 2.4 / 2.5).
 *
 * Single dialog covering all 4 destinations. Garage and Staff destinations
 * reveal their branch fields (vendor / staff user) and enforce a required
 * `expected_return_at`. The current location is disabled in the radio
 * group so users can't move "to here". On submit:
 *
 *   1. `locationService.createMovement` (inserts movement, updates vehicle,
 *      logs activity) — DB-level CHECKs guard the vendor/staff invariants.
 *   2. Toast.
 *   3. `onSuccess` callback so the page can refresh its list.
 */
export function MoveDialog({
  open,
  onOpenChange,
  vehicle,
  vendors,
  users,
  actorId,
  companyId,
  onSuccess,
}: MoveDialogProps) {
  const [destination, setDestination] = useState<VehicleLocation | null>(null);
  const [vendorId, setVendorId] = useState<UUID | "">("");
  const [staffUserId, setStaffUserId] = useState<UUID | "">("");
  const [expectedReturn, setExpectedReturn] = useState<string>(plusHoursLocal(48));
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Reset when re-opened.
  useEffect(() => {
    if (open) {
      setDestination(null);
      setVendorId("");
      setStaffUserId("");
      setExpectedReturn(plusHoursLocal(48));
      setNotes("");
      setSubmitting(false);
    }
  }, [open]);

  const activeVendors = useMemo(() => vendors.filter((v) => v.active), [vendors]);
  const activeUsers = useMemo(() => users.filter((u) => u.active), [users]);

  const needsBranch = destination === "garage" || destination === "staff";
  const errors: string[] = [];
  if (!destination) errors.push("Pick a destination");
  if (destination === vehicle.currentLocation)
    errors.push("Already at this location");
  if (destination === "garage" && !vendorId) errors.push("Pick a vendor");
  if (destination === "staff" && !staffUserId) errors.push("Pick a staff member");
  if (needsBranch && !expectedReturn) errors.push("Expected-back time required");

  const canSubmit = errors.length === 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !destination) return;
    setSubmitting(true);
    try {
      const movement = await locationService.createMovement(
        companyId,
        {
          vehicleId: vehicle.id,
          toLocation: destination,
          externalVendorId: destination === "garage" ? (vendorId as UUID) : null,
          staffUserId: destination === "staff" ? (staffUserId as UUID) : null,
          expectedReturnAt: needsBranch
            ? new Date(expectedReturn).toISOString()
            : null,
          notes: notes.trim() || null,
        },
        actorId,
      );
      toast.success(
        `Moved to ${VEHICLE_LOCATION_LABELS[destination]}`,
      );
      onSuccess?.(movement);
      onOpenChange(false);
    } catch (err) {
      // Supabase PostgrestError isn't an `Error` instance — it's a plain
      // {code, message, hint, details} object. Reach into it explicitly
      // so we surface the real reason (RLS denied / CHECK constraint /
      // FK violation) instead of a generic "try again".
      const obj = err as { message?: string; hint?: string; details?: string };
      const msg =
        (err instanceof Error && err.message) ||
        obj?.message ||
        obj?.hint ||
        obj?.details ||
        "Move failed, try again";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={`Move ${vehicle.stockId}: ${vehicle.make} ${vehicle.model}`}
      primaryAction={{
        content: "Move vehicle",
        loading: submitting,
        disabled: !canSubmit,
        onAction: () => void handleSubmit(),
      }}
      secondaryActions={[
        { content: "Cancel", onAction: () => onOpenChange(false) },
      ]}
    >
      <div className="flex flex-col gap-4">
        <p className="body-md text-(--text-secondary)">
          <span className="font-mono">{vehicle.registration}</span> · Currently
          at{" "}
          <span className="font-semibold text-(--text)">
            {VEHICLE_LOCATION_LABELS[vehicle.currentLocation]}
          </span>{" "}
          (since {shortDate(vehicle.locationSince)})
        </p>

        {/* Destination — the current location is disabled. */}
        <ChoiceList
          title="Move to"
          choices={VEHICLE_LOCATIONS.map((loc) => ({
            label: VEHICLE_LOCATION_LABELS[loc],
            value: loc,
            disabled: loc === vehicle.currentLocation,
            helpText: loc === vehicle.currentLocation ? "Current" : undefined,
          }))}
          selected={destination ? [destination] : []}
          onChange={(sel) => setDestination((sel[0] as VehicleLocation) ?? null)}
        />

        {/* Garage branch — vendor */}
        {destination === "garage" ? (
          <Select
            id="move-vendor"
            label="Workshop"
            placeholder="Select workshop"
            options={activeVendors.map((v) => ({
              label: v.speciality ? `${v.name} · ${v.speciality}` : v.name,
              value: v.id,
            }))}
            value={vendorId}
            onChange={(v) => setVendorId(v as UUID)}
            helpText="Required"
          />
        ) : null}

        {/* Staff branch — user */}
        {destination === "staff" ? (
          <Select
            id="move-staff"
            label="Staff member"
            placeholder="Select staff member"
            options={activeUsers.map((u) => ({ label: u.name, value: u.id }))}
            value={staffUserId}
            onChange={(v) => setStaffUserId(v as UUID)}
            helpText="Required"
          />
        ) : null}

        {/* Expected return — only for garage/staff */}
        {needsBranch ? (
          <Labelled id="move-expected" label="Expected back" requiredIndicator>
            <Input
              id="move-expected"
              type="datetime-local"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(e.target.value)}
            />
          </Labelled>
        ) : null}

        {/* Notes — always optional */}
        <TextField
          id="move-notes"
          label="Notes"
          multiline={2}
          value={notes}
          onChange={setNotes}
          placeholder="Reason for the move (optional)…"
        />
      </div>
    </Modal>
  );
}
