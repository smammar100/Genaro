"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Banner, Labelled, Modal, Select, TextField } from "@/components/genaro";
import { VehiclePicker } from "@/components/shared/vehicle-picker";
import { isValidUkPhone } from "@/lib/formatters";
import { toast } from "@/lib/toast";
import type { LeadChannel, User, Vehicle } from "@/lib/types";

/** A new lead as the modal hands it over. */
export interface NewLead {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  vehicle: Vehicle;
  /** The car in words, for the lead's record: "Ford Fiesta (OY70 TZG)". */
  vehicleInterest: string;
  leadChannelId: string;
  /** What the customer said, when the channel is Other. */
  channelOtherReason: string | null;
  assignedTo: string;
  notes: string | null;
}

interface CreateLeadModalProps {
  open: boolean;
  onClose: () => void;
  /** Cars a lead can be for: anything still in the business. */
  vehicles: Vehicle[];
  channels: LeadChannel[];
  users: User[];
  /** Who a new lead is assigned to until someone picks another. */
  defaultAssignee?: string;
  /**
   * Where the half-typed lead is kept, per company and user, so a page that
   * remounts mid-call doesn't lose it. Null keeps no draft.
   */
  draftKey: string | null;
  /** Saves the lead. A thrown error's message is shown in the modal. */
  onCreate: (lead: NewLead) => Promise<void>;
}

interface Form {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  vehicleId: string | null;
  leadChannelId: string;
  channelOtherReason: string;
  assignedTo: string;
  notes: string;
}

const EMPTY: Form = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  vehicleId: null,
  leadChannelId: "",
  channelOtherReason: "",
  assignedTo: "",
  notes: "",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hasContent = (f: Form): boolean =>
  Boolean(
    f.customerName.trim() ||
      f.customerPhone.trim() ||
      f.customerEmail.trim() ||
      f.vehicleId ||
      f.notes.trim(),
  );

function readDraft(key: string | null): Partial<Form> | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<Form>) : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string | null, form: Form | null) {
  if (!key) return;
  try {
    if (form && hasContent(form)) localStorage.setItem(key, JSON.stringify(form));
    else localStorage.removeItem(key);
  } catch {
    // Storage blocked or full: the draft is best effort.
  }
}

/**
 * Create lead, from the sales pipeline (call 2026-10-31: leads are taken
 * there now). The lead opens a deal on its car in New lead, so the car is
 * required. Closing the modal discards the lead, so the next one starts
 * empty; a draft only outlives a page that remounts while it is open.
 * @import import { CreateLeadModal } from "@/components/sales/create-lead-modal";
 */
export function CreateLeadModal({
  open,
  onClose,
  vehicles,
  channels,
  users,
  defaultAssignee = "",
  draftKey,
  onCreate,
}: CreateLeadModalProps) {
  const pickerId = useId();
  const [form, setForm] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start empty (or from a draft) each time the modal opens.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm({ ...EMPTY, assignedTo: defaultAssignee });
      setTouched(false);
      setError(null);
    }
  }

  // The draft is read after opening, not while rendering: storage only exists
  // in the browser. Once per opening, though Strict Mode runs effects twice.
  const draftRead = useRef(false);
  useEffect(() => {
    if (!open) {
      draftRead.current = false;
      return;
    }
    if (draftRead.current) return;
    draftRead.current = true;
    const draft = readDraft(draftKey);
    if (!draft) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((f) => ({ ...f, ...draft, assignedTo: draft.assignedTo || f.assignedTo }));
    toast("Draft restored: your unsaved lead was still here");
  }, [open, draftKey]);

  const set = <K extends keyof Form>(field: K, value: Form[K]) =>
    setForm((f) => {
      const next = { ...f, [field]: value };
      writeDraft(draftKey, next);
      return next;
    });

  const vehicle = vehicles.find((v) => v.id === form.vehicleId) ?? null;
  const channel = channels.find((c) => c.id === form.leadChannelId) ?? null;

  const problems = {
    customerName: form.customerName.trim() ? null : "Enter the customer's name.",
    customerPhone: isValidUkPhone(form.customerPhone)
      ? null
      : "Enter a valid UK phone number (e.g. 07712 345678 or 020 7946 0958)",
    customerEmail:
      !form.customerEmail.trim() || EMAIL.test(form.customerEmail.trim())
        ? null
        : "Enter a valid email address, or leave it blank.",
    vehicle: vehicle ? null : "Pick the car the customer is interested in.",
    leadChannelId: channel ? null : "Pick where the lead came from.",
    assignedTo: form.assignedTo ? null : "Pick who the lead is assigned to.",
  };
  const show = (field: keyof typeof problems) => (touched ? problems[field] ?? undefined : undefined);

  async function create() {
    setTouched(true);
    if (Object.values(problems).some(Boolean) || !vehicle) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim() || null,
        vehicle,
        vehicleInterest: `${vehicle.make} ${vehicle.model} (${vehicle.registration})`,
        leadChannelId: form.leadChannelId,
        channelOtherReason:
          channel?.slug === "other" ? form.channelOtherReason.trim() || null : null,
        assignedTo: form.assignedTo,
        notes: form.notes.trim() || null,
      });
      writeDraft(draftKey, null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the lead.");
    } finally {
      setSaving(false);
    }
  }

  const close = () => {
    if (saving) return;
    writeDraft(draftKey, null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create lead"
      primaryAction={{ content: "Create lead", loading: saving, onAction: () => void create() }}
      secondaryActions={[{ content: "Cancel", onAction: close }]}
    >
      <div className="flex flex-col gap-4">
        {error ? <Banner tone="critical">{error}</Banner> : null}
        <TextField
          label="Name"
          value={form.customerName}
          onChange={(v) => set("customerName", v)}
          autoComplete="name"
          error={show("customerName")}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Phone"
            type="tel"
            value={form.customerPhone}
            onChange={(v) => set("customerPhone", v)}
            autoComplete="tel"
            error={show("customerPhone")}
          />
          <TextField
            label="Email"
            type="email"
            value={form.customerEmail}
            onChange={(v) => set("customerEmail", v)}
            autoComplete="email"
            error={show("customerEmail")}
          />
        </div>
        <Labelled
          id={pickerId}
          label="Vehicle"
          helpText="Search by reg. The lead opens a deal on this car in New lead."
          error={show("vehicle")}
        >
          <VehiclePicker
            id={pickerId}
            vehicles={vehicles}
            value={vehicle}
            placeholder="Search by reg"
            onChange={(v) => set("vehicleId", v?.id ?? null)}
          />
        </Labelled>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Lead channel"
            placeholder="Where did this lead come from?"
            options={channels.map((c) => ({ label: c.label, value: c.id }))}
            value={form.leadChannelId}
            onChange={(v) => set("leadChannelId", v)}
            error={show("leadChannelId")}
          />
          <Select
            label="Assigned to"
            placeholder="Pick a user"
            options={users.map((u) => ({ label: u.name, value: u.id }))}
            value={form.assignedTo}
            onChange={(v) => set("assignedTo", v)}
            error={show("assignedTo")}
          />
        </div>
        {channel?.slug === "other" ? (
          <TextField
            label="How did they hear about us?"
            value={form.channelOtherReason}
            onChange={(v) => set("channelOtherReason", v)}
          />
        ) : null}
        <TextField
          label="Notes"
          multiline={3}
          value={form.notes}
          onChange={(v) => set("notes", v)}
        />
      </div>
    </Modal>
  );
}
