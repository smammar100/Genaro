"use client";

import { useId, useState } from "react";
import { Banner, Labelled, Modal, Select, TextField } from "@/components/polaris";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { appointmentService } from "@/lib/services/appointment-service";
import { checkReschedule, type SlotRef } from "@/lib/appointment-schedule";
import { hourlyOptions, resolveHours, fmtHour } from "@/lib/calendar-model";
import { todayKey } from "@/components/kanban/card-dates";
import type { SalesDeal, Vehicle } from "@/lib/types";

interface BookAppointmentModalProps {
  /** The deal to book for; null keeps the modal closed. */
  deal: SalesDeal | null;
  vehicle: Vehicle | null;
  /** Every appointment, to warn about clashes. */
  appointments: SlotRef[];
  onClose: () => void;
  onBooked: () => void;
}

/**
 * Book a viewing straight from a pipeline card (call 2026-10-24). The car and
 * the customer come from the deal, so only the slot is asked for; it opens on
 * 09:00 today. The booking lands on the Appointments calendar like any other.
 */
export function BookAppointmentModal({
  deal,
  vehicle,
  appointments,
  onClose,
  onBooked,
}: BookAppointmentModalProps) {
  const { user, company } = useAuth();
  const dateId = useId();
  const hours = resolveHours(company);
  const slots = hourlyOptions(hours);
  // 09:00 unless the day starts later (call 2026-10-24).
  const firstSlot = slots.includes("09:00") ? "09:00" : (slots[0] ?? "09:00");
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState(firstSlot);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A fresh form for each deal the modal opens on.
  const [forDeal, setForDeal] = useState(deal?.id ?? null);
  if ((deal?.id ?? null) !== forDeal) {
    setForDeal(deal?.id ?? null);
    setDate(todayKey());
    setTime(firstSlot);
    setNotes("");
    setError(null);
  }

  const check = checkReschedule({ id: "new", date, time }, appointments, {
    start: fmtHour(hours.open),
    end: fmtHour(hours.close),
  });

  async function book() {
    if (!deal || !user || !company) return;
    if (!check.ok) {
      setError(check.error ?? "Pick another slot.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await appointmentService.create({
        companyId: company.id,
        vehicleId: deal.vehicleId,
        leadId: deal.leadId,
        customerName: deal.customerName,
        customerPhone: deal.customerPhone,
        customerEmail: deal.customerEmail ?? "",
        date,
        time,
        specialRequirements: notes.trim() || null,
        createdBy: user.id,
      });
      onBooked();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't book the appointment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={deal !== null}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={`Book appointment for ${deal?.customerName ?? ""}`}
      primaryAction={{ content: "Book appointment", loading: saving, onAction: () => void book() }}
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
        <p className="body-md text-(--text-secondary)">
          {vehicle
            ? `${vehicle.registration}, ${vehicle.make} ${vehicle.model}. `
            : ""}
          Adds a 1-hour viewing to the Appointments calendar.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Labelled id={dateId} label="Date">
            <Input
              id={dateId}
              type="date"
              value={date}
              min={todayKey()}
              onChange={(e) => setDate(e.target.value)}
            />
          </Labelled>
          <Select
            label="Time"
            options={slots.map((s) => ({ label: s, value: s }))}
            value={time}
            onChange={setTime}
          />
        </div>
        <TextField
          label="Special requirements"
          value={notes}
          onChange={setNotes}
        />
        {check.warning ? <Banner tone="warning">{check.warning}</Banner> : null}
        {error ? <Banner tone="critical">{error}</Banner> : null}
      </div>
    </Modal>
  );
}
