"use client";

import { useId, useState } from "react";
import { Banner, Labelled, Modal, Select, TextField } from "@/components/polaris";
import { VehiclePicker } from "@/components/shared/vehicle-picker";
import {
  fmtHour,
  halfHourOptions,
  hmToDec,
  hourlyOptions,
  type BusinessHours,
  type CalEvent,
  type Kind,
} from "@/lib/calendar-model";
import type { Vehicle } from "@/lib/types";
import { KIND_META } from "./event-meta";

export interface FormFields {
  kind: Kind;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  vehicleId: string;
  vehicleReg: string;
  vehicleDescription: string;
  description: string;
  date: string;
  /** "HH:mm"; empty for maintenance with no time booked (all day). */
  time: string;
  notes: string;
}

export const EMPTY_FIELDS: FormFields = {
  kind: "appt",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  vehicleId: "",
  vehicleReg: "",
  vehicleDescription: "",
  description: "",
  date: "",
  time: "10:00",
  notes: "",
};

// Stored times can carry seconds ("11:00:00"); the pickers use "HH:mm".
const hm = (t: string | null | undefined): string => (t ? t.slice(0, 5) : "");

export function fieldsForEvent(ev: CalEvent): FormFields {
  switch (ev.kind) {
    case "appt":
      return {
        ...EMPTY_FIELDS,
        kind: "appt",
        customerName: ev.raw.customerName,
        customerPhone: ev.raw.customerPhone,
        customerEmail: ev.raw.customerEmail,
        vehicleId: ev.raw.vehicleId,
        date: ev.raw.date,
        time: hm(ev.raw.time),
        notes: ev.raw.specialRequirements ?? "",
      };
    case "workshop":
      return {
        ...EMPTY_FIELDS,
        kind: "workshop",
        customerName: ev.raw.customerName,
        customerPhone: ev.raw.customerPhone,
        vehicleReg: ev.raw.vehicleReg,
        vehicleDescription: ev.raw.vehicleDescription,
        description: ev.raw.description,
        date: ev.raw.scheduledDate,
        time: hm(ev.raw.scheduledTime),
        notes: ev.raw.notes ?? "",
      };
    case "maint":
      return {
        ...EMPTY_FIELDS,
        kind: "maint",
        vehicleId: ev.raw.vehicleId,
        description: ev.raw.description,
        date: ev.raw.dueDate ?? ev.date,
        time: hm(ev.raw.scheduledTime),
        notes: ev.raw.notes ?? "",
      };
  }
}

export function validateFields(f: FormFields): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return "Pick a date.";
  if (f.kind === "appt") {
    if (!f.customerName.trim()) return "Add the customer's name.";
    if (!f.customerPhone.trim()) return "Add the customer's phone number.";
    if (!f.vehicleId) return "Pick a vehicle.";
    if (!f.time) return "Pick a time.";
  }
  if (f.kind === "workshop") {
    if (!f.customerName.trim()) return "Add the customer's name.";
    if (!f.vehicleReg.trim()) return "Add the vehicle registration.";
    if (!f.vehicleDescription.trim()) return "Describe the vehicle.";
    if (!f.description.trim()) return "Describe the job.";
    if (!f.time) return "Pick a time.";
  }
  if (f.kind === "maint") {
    if (!f.description.trim()) return "Describe the maintenance job.";
    if (!f.vehicleId) return "Pick a vehicle.";
  }
  return null;
}

/**
 * Create or edit an event. Appointments book whole-hour slots, workshop and
 * maintenance half-hours, all within opening hours; maintenance can also stay
 * all day. A time saved outside today's hours stays selectable, so an old
 * booking can be edited without being moved.
 */
export function EventFormModal({
  heading,
  submitLabel,
  initial,
  kinds,
  showKindPicker,
  vehicles,
  hours,
  saving,
  onClose,
  onSubmit,
}: {
  heading: string;
  submitLabel: string;
  initial: FormFields;
  kinds: Kind[];
  showKindPicker: boolean;
  vehicles: Vehicle[];
  hours: BusinessHours;
  saving: boolean;
  onClose: () => void;
  onSubmit: (fields: FormFields) => void;
}) {
  const [fields, setFields] = useState<FormFields>(initial);
  const [error, setError] = useState<string | null>(null);
  const dateId = useId();
  const vehicleId = useId();

  const set = <K extends keyof FormFields>(key: K, value: FormFields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    // The message was about the other form.
    if (key === "kind") setError(null);
  };

  const submit = () => {
    const problem = validateFields(fields);
    setError(problem);
    if (!problem) onSubmit(fields);
  };

  const base = fields.kind === "appt" ? hourlyOptions(hours) : halfHourOptions(hours);
  const times = fields.time && !base.includes(fields.time) ? [fields.time, ...base] : base;
  const timeOptions = [
    ...(fields.kind === "maint" ? [{ label: "All day", value: "" }] : []),
    ...times.map((t) => ({ label: fmtHour(hmToDec(t)), value: t })),
  ];

  const vehiclePicker = (
    <Labelled id={vehicleId} label="Vehicle">
      <VehiclePicker
        id={vehicleId}
        vehicles={vehicles}
        value={vehicles.find((v) => v.id === fields.vehicleId) ?? null}
        onChange={(v) => set("vehicleId", v?.id ?? "")}
      />
    </Labelled>
  );

  const when = (
    <div className="grid grid-cols-2 gap-3">
      <Labelled id={dateId} label={fields.kind === "maint" ? "Due date" : "Date"}>
        <div className="p-field">
          <input
            id={dateId}
            type="date"
            className="p-field__input"
            value={fields.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
      </Labelled>
      <Select label="Time" options={timeOptions} value={fields.time} onChange={(v) => set("time", v)} />
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={heading}
      primaryAction={{ content: submitLabel, loading: saving, onAction: submit }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <div className="flex flex-col gap-4">
        {error ? <Banner tone="critical">{error}</Banner> : null}

        {showKindPicker ? (
          <Select
            label="Calendar"
            options={kinds.map((k) => ({ label: KIND_META[k].singular, value: k }))}
            value={fields.kind}
            onChange={(v) => set("kind", v as Kind)}
          />
        ) : null}

        {fields.kind === "appt" ? (
          <>
            <TextField label="Customer name" value={fields.customerName} onChange={(v) => set("customerName", v)} autoComplete="name" />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Phone" type="tel" value={fields.customerPhone} onChange={(v) => set("customerPhone", v)} autoComplete="tel" />
              <TextField label="Email" type="email" value={fields.customerEmail} onChange={(v) => set("customerEmail", v)} autoComplete="email" />
            </div>
            {vehiclePicker}
            {when}
            <TextField label="Special requirements" multiline value={fields.notes} onChange={(v) => set("notes", v)} />
          </>
        ) : null}

        {fields.kind === "workshop" ? (
          <>
            <TextField label="Customer name" value={fields.customerName} onChange={(v) => set("customerName", v)} autoComplete="name" />
            <TextField label="Phone" type="tel" value={fields.customerPhone} onChange={(v) => set("customerPhone", v)} autoComplete="tel" />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Vehicle reg" placeholder="BD70 KLM" value={fields.vehicleReg} onChange={(v) => set("vehicleReg", v)} />
              <TextField label="Vehicle" placeholder="BMW 3 Series" value={fields.vehicleDescription} onChange={(v) => set("vehicleDescription", v)} />
            </div>
            <TextField label="Job" placeholder="MOT prep, brake inspection…" value={fields.description} onChange={(v) => set("description", v)} />
            {when}
            <TextField label="Notes" multiline value={fields.notes} onChange={(v) => set("notes", v)} />
          </>
        ) : null}

        {fields.kind === "maint" ? (
          <>
            <TextField label="Job" placeholder="Cambelt change, MOT due…" value={fields.description} onChange={(v) => set("description", v)} />
            {vehiclePicker}
            {when}
            <TextField label="Notes" multiline value={fields.notes} onChange={(v) => set("notes", v)} />
          </>
        ) : null}
      </div>
    </Modal>
  );
}
