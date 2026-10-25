"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { halfHourOptions, hourlyOptions, resolveHours } from "@/lib/calendar-model";
import { todayKey } from "@/components/kanban/card-dates";
import { notify } from "@/lib/toast";
import type { MaintenanceJob, SalesDeal, Vehicle } from "@/lib/types";
import { EventFormModal, EMPTY_FIELDS, type FormFields } from "./event-form-modal";
import { createEvent, updateEvent } from "./event-actions";

/** What a pipeline card books: a viewing for a deal, or a slot for a job. */
export type QuickBooking =
  | { kind: "appt"; deal: SalesDeal }
  | { kind: "maint"; job: MaintenanceJob };

// 09:00 unless the day starts later (call 2026-10-24).
const firstSlot = (slots: string[]) =>
  slots.includes("09:00") ? "09:00" : (slots[0] ?? "09:00");

/** The calendar form's fields, filled from the card. */
function initialFields(booking: QuickBooking, slots: string[]): FormFields {
  const today = todayKey();
  if (booking.kind === "appt") {
    const { deal } = booking;
    return {
      ...EMPTY_FIELDS,
      kind: "appt",
      customerName: deal.customerName,
      customerPhone: deal.customerPhone,
      customerEmail: deal.customerEmail ?? "",
      vehicleId: deal.vehicleId,
      date: today,
      time: firstSlot(slots),
    };
  }
  const { job } = booking;
  return {
    ...EMPTY_FIELDS,
    kind: "maint",
    vehicleId: job.vehicleId,
    description: job.description,
    // Keep a due date still ahead; an overdue or missing one starts today.
    date: job.dueDate && job.dueDate >= today ? job.dueDate : today,
    time: job.scheduledTime ? job.scheduledTime.slice(0, 5) : firstSlot(slots),
    notes: job.notes ?? "",
  };
}

const BOOKED: Record<QuickBooking["kind"], string> = {
  appt: "Appointment booked. It's on the Appointments and Master calendars.",
  maint: "Job booked. It's on the Maintenance and Master calendars.",
};

/**
 * Quick booking from a pipeline card (call 2026-10-24). It opens the
 * calendars' own form filled from the card — the deal's customer and car, or
 * the job and its car — so only the slot needs picking, and saves through the
 * calendars' own writes. A deal gets a new appointment, linked to its lead; a
 * job is booked into its slot rather than duplicated.
 */
export function QuickBookModal({
  booking,
  vehicles,
  onClose,
  onBooked,
}: {
  /** What to book; null keeps the modal closed. */
  booking: QuickBooking | null;
  /** Cars the form's vehicle picker offers. */
  vehicles: Vehicle[];
  onClose: () => void;
  onBooked: () => void;
}) {
  const { company, user } = useAuth();
  const [saving, setSaving] = useState(false);
  if (!booking) return null;

  const hours = resolveHours(company);
  const slots = booking.kind === "appt" ? hourlyOptions(hours) : halfHourOptions(hours);
  const subject =
    booking.kind === "appt" ? booking.deal.customerName : booking.job.description;

  async function submit(fields: FormFields) {
    if (!booking || !company || !user || saving) return;
    setSaving(true);
    try {
      if (booking.kind === "appt") {
        await createEvent(fields, {
          companyId: company.id,
          userId: user.id,
          leadId: booking.deal.leadId,
        });
      } else {
        await updateEvent(
          { kind: "maint", id: booking.job.id, scheduledTime: booking.job.scheduledTime },
          fields,
          user.id,
        );
      }
      notify.success(BOOKED[booking.kind]);
      onBooked();
      onClose();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Couldn't book it");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EventFormModal
      // A fresh form for each card.
      key={booking.kind === "appt" ? booking.deal.id : booking.job.id}
      heading={`Book appointment: ${subject}`}
      submitLabel="Book appointment"
      initial={initialFields(booking, slots)}
      kinds={[booking.kind]}
      showKindPicker={false}
      vehicles={vehicles}
      hours={hours}
      saving={saving}
      onClose={() => {
        if (!saving) onClose();
      }}
      onSubmit={(fields) => void submit(fields)}
    />
  );
}
