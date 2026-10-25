"use client";

import { useId, useState } from "react";
import { Banner, Labelled, Modal, Select, TextField } from "@/components/polaris";
import { VehiclePicker } from "@/components/shared/vehicle-picker";
import { isValidUkPhone } from "@/lib/formatters";
import type { Lead, LeadChannel, User, Vehicle } from "@/lib/types";

/** Everything on a lead that staff can change. */
export interface LeadEdits {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  /** The linked stock car; null for a free-text enquiry. */
  vehicle: Vehicle | null;
  vehicleInterest: string;
  leadChannelId: string | null;
  assignedTo: string;
  notes: string | null;
}

interface EditLeadModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  /** The lead's linked car, when it has one. */
  vehicle: Vehicle | null;
  /** Cars that can be linked: anything still in the business. */
  vehicles: Vehicle[];
  channels: LeadChannel[];
  users: User[];
  /** Saves the edits. A thrown error's message is shown in the modal. */
  onSave: (edits: LeadEdits) => Promise<void>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Edit every part of a lead: the customer's details, the car, the channel, who
 * it's assigned to and the notes (call 2026-10-24). The fields match Create
 * lead's, so a lead reads the same way it was taken.
 */
export function EditLeadModal({
  open,
  onClose,
  lead,
  vehicle,
  vehicles,
  channels,
  users,
  onSave,
}: EditLeadModalProps) {
  const pickerId = useId();
  const initial = (): LeadEdits => ({
    customerName: lead.customerName,
    customerPhone: lead.customerPhone,
    customerEmail: lead.customerEmail,
    vehicle,
    vehicleInterest: lead.vehicleInterest,
    leadChannelId: lead.leadChannelId ?? null,
    assignedTo: lead.assignedTo,
    notes: lead.notes,
  });
  const [edits, setEdits] = useState<LeadEdits>(initial);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from the lead as it is each time the modal opens.
  const [openedFor, setOpenedFor] = useState<string | null>(open ? lead.id : null);
  const key = open ? lead.id : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    if (open) {
      setEdits(initial());
      setTouched(false);
      setError(null);
    }
  }

  const set = <K extends keyof LeadEdits>(field: K, value: LeadEdits[K]) =>
    setEdits((e) => ({ ...e, [field]: value }));

  const problems = {
    customerName: edits.customerName.trim() ? null : "Enter the customer's name.",
    customerPhone: isValidUkPhone(edits.customerPhone)
      ? null
      : "Enter a valid UK phone number (e.g. 07712 345678 or 020 7946 0958)",
    customerEmail:
      !edits.customerEmail?.trim() || EMAIL.test(edits.customerEmail.trim())
        ? null
        : "Enter a valid email address, or leave it blank.",
    assignedTo: edits.assignedTo ? null : "Pick who the lead is assigned to.",
  };
  const show = (field: keyof typeof problems) => (touched ? problems[field] ?? undefined : undefined);

  async function save() {
    setTouched(true);
    if (Object.values(problems).some(Boolean)) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...edits,
        customerName: edits.customerName.trim(),
        customerPhone: edits.customerPhone.trim(),
        customerEmail: edits.customerEmail?.trim() || null,
        vehicleInterest: edits.vehicleInterest.trim(),
        notes: edits.notes?.trim() || null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the lead.");
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
      title={`Edit lead: ${lead.customerName}`}
      primaryAction={{ content: "Save lead", loading: saving, onAction: () => void save() }}
      secondaryActions={[{ content: "Cancel", onAction: close }]}
    >
      <div className="flex flex-col gap-4">
        {error ? <Banner tone="critical">{error}</Banner> : null}
        <TextField
          label="Name"
          value={edits.customerName}
          onChange={(v) => set("customerName", v)}
          autoComplete="name"
          error={show("customerName")}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Phone"
            type="tel"
            value={edits.customerPhone}
            onChange={(v) => set("customerPhone", v)}
            autoComplete="tel"
            error={show("customerPhone")}
          />
          <TextField
            label="Email"
            type="email"
            value={edits.customerEmail ?? ""}
            onChange={(v) => set("customerEmail", v)}
            autoComplete="email"
            error={show("customerEmail")}
          />
        </div>
        <Labelled
          id={pickerId}
          label="Vehicle"
          helpText="Search by reg. Changing it moves an open deal for this lead to the new car."
        >
          <VehiclePicker
            id={pickerId}
            vehicles={vehicles}
            value={edits.vehicle}
            emptyOptionLabel="None / free text"
            placeholder="Search by reg, or leave blank for free text"
            onChange={(v) => {
              set("vehicle", v);
              if (v) set("vehicleInterest", `${v.make} ${v.model} (${v.registration})`);
            }}
          />
        </Labelled>
        <TextField
          label="Vehicle interest"
          value={edits.vehicleInterest}
          onChange={(v) => set("vehicleInterest", v)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Lead channel"
            placeholder="Where did this lead come from?"
            options={channels.map((c) => ({ label: c.label, value: c.id }))}
            value={edits.leadChannelId ?? ""}
            onChange={(v) => set("leadChannelId", v || null)}
          />
          <Select
            label="Assigned to"
            placeholder="Pick a user"
            options={users.map((u) => ({ label: u.name, value: u.id }))}
            value={edits.assignedTo}
            onChange={(v) => set("assignedTo", v)}
            error={show("assignedTo")}
          />
        </div>
        <TextField
          label="Notes"
          multiline={3}
          value={edits.notes ?? ""}
          onChange={(v) => set("notes", v)}
        />
      </div>
    </Modal>
  );
}
