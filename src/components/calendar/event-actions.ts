import { appointmentService } from "@/lib/services/appointment-service";
import { workshopService } from "@/lib/services/workshop-service";
import { maintenanceService } from "@/lib/services/maintenance-service";
import type { Kind } from "@/lib/calendar-model";
import type { UUID } from "@/lib/types";
import type { FormFields } from "./event-form-modal";

/**
 * The writes behind the calendar form, shared by the calendars and the
 * pipeline cards' quick booking so a booking is the same record wherever it
 * is made, and shows on every calendar that covers its kind.
 */

interface Actor {
  companyId: UUID;
  userId: UUID;
}

export async function createEvent(
  fields: FormFields,
  { companyId, userId, leadId = null }: Actor & { leadId?: UUID | null },
): Promise<void> {
  if (fields.kind === "appt") {
    await appointmentService.create({
      companyId,
      vehicleId: fields.vehicleId,
      leadId,
      customerName: fields.customerName.trim(),
      customerPhone: fields.customerPhone.trim(),
      customerEmail: fields.customerEmail.trim(),
      date: fields.date,
      time: fields.time,
      specialRequirements: fields.notes.trim() || null,
      createdBy: userId,
    });
  } else if (fields.kind === "workshop") {
    // Walk-ins aren't linked to stock: workshop_jobs has no vehicle_id.
    await workshopService.create(
      {
        companyId,
        customerName: fields.customerName.trim(),
        customerPhone: fields.customerPhone.trim(),
        vehicleReg: fields.vehicleReg.trim(),
        vehicleDescription: fields.vehicleDescription.trim(),
        description: fields.description.trim(),
        assignedTo: null,
        estimatedCost: null,
        scheduledDate: fields.date,
        scheduledTime: fields.time,
        notes: fields.notes.trim() || null,
      },
      userId,
    );
  } else {
    // A calendar-made job is a stub: vendor, assignee, costs and duration
    // are filled in later from the Maintenance pipeline. It starts on its
    // due date so it's schedulable straight away.
    await maintenanceService.create(
      {
        companyId,
        vehicleId: fields.vehicleId,
        description: fields.description.trim(),
        assignedTo: null,
        vendorId: null,
        estimatedCost: null,
        estimatedDurationHours: null,
        startDate: fields.date,
        dueDate: fields.date,
        scheduledTime: fields.time || null,
        notes: fields.notes.trim() || null,
      },
      userId,
    );
  }
}

/** An existing record: its kind, id and, for a maintenance job, its stored time. */
export interface EventRef {
  kind: Kind;
  id: UUID;
  /** The job's current `scheduled_time` ("11:00:00" or null). */
  scheduledTime?: string | null;
}

export async function updateEvent(
  ref: EventRef,
  fields: FormFields,
  userId: UUID,
): Promise<void> {
  if (ref.kind === "appt") {
    await appointmentService.update(
      ref.id,
      {
        customerName: fields.customerName.trim(),
        customerPhone: fields.customerPhone.trim(),
        customerEmail: fields.customerEmail.trim(),
        vehicleId: fields.vehicleId,
        date: fields.date,
        time: fields.time,
        specialRequirements: fields.notes.trim() || null,
      },
      userId,
    );
  } else if (ref.kind === "workshop") {
    await workshopService.update(ref.id, {
      customerName: fields.customerName.trim(),
      customerPhone: fields.customerPhone.trim(),
      vehicleReg: fields.vehicleReg.trim(),
      vehicleDescription: fields.vehicleDescription.trim(),
      description: fields.description.trim(),
      scheduledDate: fields.date,
      scheduledTime: fields.time,
      notes: fields.notes.trim() || null,
    });
  } else {
    // Stored times carry seconds; only send the time when it changed, so
    // an untouched save doesn't log a "Job updated" note.
    const timeChanged = (ref.scheduledTime ?? "").slice(0, 5) !== fields.time;
    await maintenanceService.update(
      ref.id,
      {
        vehicleId: fields.vehicleId,
        description: fields.description.trim(),
        dueDate: fields.date,
        ...(timeChanged ? { scheduledTime: fields.time || null } : {}),
        notes: fields.notes.trim() || null,
      },
      userId,
    );
  }
}
