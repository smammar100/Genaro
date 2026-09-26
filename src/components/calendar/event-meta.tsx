import {
  Ban,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  CircleDot,
  Clock,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type { BadgeTone } from "@/components/polaris";
import { JOB_STATUS_BADGE, jobStatusLabel } from "@/components/maintenance/job-status";
import { fmtHour, type CalEvent, type Kind } from "@/lib/calendar-model";
import type { AppointmentStatus } from "@/lib/types";

/**
 * How each source looks on the calendar. Appointments are blue, workshop
 * walk-ins amber and maintenance purple: the same three everywhere the
 * calendar appears.
 */
export const KIND_META: Record<
  Kind,
  {
    /** Plural, for filters: "Appointments". */
    label: string;
    /** Sentence-case singular: "Workshop job". */
    singular: string;
    /** Swatch and the card's accent bar. */
    accent: string;
    /** Resting card fill and its hover. */
    surface: string;
    /** Tinted text on the resting card. */
    tint: string;
    /** Solid fill while the event's details are open. */
    selected: string;
  }
> = {
  appt: {
    label: "Appointments",
    singular: "Appointment",
    accent: "bg-(--bg-fill-emphasis)",
    surface: "bg-(--bg-surface-info) hover:bg-(--bg-surface-info-hover)",
    tint: "text-(--text-info)",
    selected: "bg-(--bg-fill-emphasis) text-(--text-emphasis-on-bg-fill)",
  },
  workshop: {
    label: "Workshop",
    singular: "Workshop job",
    accent: "bg-(--bg-fill-warning)",
    surface: "bg-(--bg-surface-warning) hover:bg-(--bg-surface-warning-hover)",
    tint: "text-(--text-warning)",
    selected: "bg-(--bg-fill-warning) text-(--text-warning-on-bg-fill)",
  },
  maint: {
    label: "Maintenance",
    singular: "Maintenance job",
    accent: "bg-(--bg-fill-magic)",
    surface: "bg-(--bg-surface-magic) hover:bg-(--bg-surface-magic-hover)",
    tint: "text-(--text-magic)",
    selected: "bg-(--bg-fill-magic) text-(--text-magic-on-bg-fill)",
  },
};

export interface EventStatus {
  label: string;
  tone: BadgeTone;
  Icon: LucideIcon;
  /** Icon colour on a resting card. */
  iconTone: string;
  /** Worth flagging on the card itself, not just in the details. */
  flag: boolean;
  /** Finished with: the card goes quiet like a past event. */
  done: boolean;
  /** Called off: the card is outlined and struck through. */
  struck: boolean;
}

const APPT_STATUS: Record<AppointmentStatus, EventStatus> = {
  upcoming: { label: "Upcoming", tone: "info", Icon: Clock, iconTone: "text-(--icon-info)", flag: false, done: false, struck: false },
  completed: { label: "Completed", tone: "success", Icon: CheckCircle2, iconTone: "text-(--icon-success)", flag: true, done: true, struck: false },
  cancelled: { label: "Cancelled", tone: "neutral", Icon: Ban, iconTone: "text-(--icon-secondary)", flag: true, done: true, struck: true },
  no_show: { label: "No-show", tone: "critical", Icon: UserX, iconTone: "text-(--icon-critical)", flag: true, done: true, struck: false },
};

// Same icons as the maintenance pipeline, so a job reads the same in both.
const JOB_ICON = {
  pending: { Icon: CircleDashed, iconTone: "text-(--icon-secondary)" },
  in_progress: { Icon: CircleDot, iconTone: "text-(--icon-info)" },
  completed: { Icon: CheckCircle2, iconTone: "text-(--icon-success)" },
  stalled: { Icon: CircleAlert, iconTone: "text-(--icon-caution)" },
} as const;

export function eventStatus(ev: CalEvent): EventStatus {
  if (ev.kind === "appt") return APPT_STATUS[ev.raw.status] ?? APPT_STATUS.upcoming;
  const status = ev.raw.status;
  return {
    label: jobStatusLabel(status),
    tone: JOB_STATUS_BADGE[status]?.tone ?? "neutral",
    ...(JOB_ICON[status] ?? JOB_ICON.pending),
    flag: status !== "pending",
    done: status === "completed",
    struck: false,
  };
}

/** "11:00 – 12:00" for appointments (real one-hour slots), "10:30" for jobs. */
export function timeText(ev: CalEvent): string {
  if (ev.allDay) return "All day";
  return ev.kind === "appt" ? `${fmtHour(ev.start)} – ${fmtHour(ev.end)}` : fmtHour(ev.start);
}
