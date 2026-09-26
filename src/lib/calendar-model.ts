/**
 * The shared calendar's model: appointments, workshop walk-ins and maintenance
 * jobs merged into one event shape, the date maths behind the day / week /
 * month views, the business-hours window and the side-by-side layout for
 * events that overlap. Pure functions only; the views in
 * src/components/calendar render what these return.
 */
import type {
  Appointment,
  Company,
  MaintenanceJob,
  UUID,
  Vehicle,
  WorkshopJob,
} from "@/lib/types";
import { titleCase } from "@/lib/utils";

/* ------------------------------------------------------------------ types */

export type Kind = "appt" | "workshop" | "maint";
export type ViewKey = "day" | "week" | "month";
export const ALL_KINDS: Kind[] = ["appt", "workshop", "maint"];

interface CalEventBase {
  key: string;
  id: UUID;
  /** Customer for appointments and walk-ins, the job for maintenance. */
  title: string;
  /** YYYY-MM-DD. */
  date: string;
  /** Decimal hours, 9.5 = 09:30. */
  start: number;
  end: number;
  /** Maintenance booked without a time sits in the all-day row. */
  allDay: boolean;
  reg: string | null;
  /** Short "Make Model" for the card. */
  car: string | null;
  /** What a walk-in is booked for ("MOT + brake check"). */
  job: string | null;
  /** Stock vehicle, for the "Open vehicle" link. */
  vehicleId: UUID | null;
}

export type CalEvent =
  | (CalEventBase & { kind: "appt"; raw: Appointment })
  | (CalEventBase & { kind: "workshop"; raw: WorkshopJob })
  | (CalEventBase & { kind: "maint"; raw: MaintenanceJob });

/* ------------------------------------------------------------------ dates */

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const DAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];
export const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const pad2 = (n: number): string => String(n).padStart(2, "0");
export const toISO = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const fromISO = (iso: string): Date => new Date(`${iso}T00:00:00`);
export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
/** Monday = 0 … Sunday = 6. */
export const weekdayMon0 = (d: Date): number => (d.getDay() + 6) % 7;
export const startOfWeek = (d: Date): Date => addDays(d, -weekdayMon0(d));
export const weekOf = (d: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(d), i));

export function addMonthsClamped(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(d.getDate(), lastDay));
  return x;
}

export const hmToDec = (hm: string): number => {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
};
export const decToHm = (d: number): string =>
  `${pad2(Math.floor(d))}:${pad2(Math.round((d - Math.floor(d)) * 60))}`;
/** 9.5 → "9:30". */
export const fmtHour = (h: number): string => {
  const hh = Math.floor(h);
  return `${hh}:${pad2(Math.round((h - hh) * 60))}`;
};

/** Monday-first weeks covering the anchor's month, spill-over days included. */
export function buildMonthGrid(anchor: Date): Date[][] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const rows = Math.ceil((weekdayMon0(first) + daysInMonth) / 7);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => addDays(gridStart, r * 7 + c)),
  );
}

export function weekLabel(days: Date[]): string {
  const a = days[0];
  const b = days[days.length - 1];
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${b.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  }
  if (a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} ${MONTHS[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MONTHS[b.getMonth()].slice(0, 3)} ${a.getFullYear()}`;
  }
  return `${a.getDate()} ${MONTHS[a.getMonth()].slice(0, 3)} ${a.getFullYear()} – ${b.getDate()} ${MONTHS[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`;
}

/** "Saturday 26 September 2026". */
export const dayLabel = (d: Date): string =>
  `${DAY_NAMES[weekdayMon0(d)]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/** "Sat 26 Sep". */
export const shortDayLabel = (d: Date): string =>
  `${DOW[weekdayMon0(d)]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

export function viewLabel(view: ViewKey, anchor: Date): string {
  if (view === "month") return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  if (view === "week") return weekLabel(weekOf(anchor));
  return dayLabel(anchor);
}

/**
 * The days a view draws. Month includes the spill-over days from the
 * neighbouring months, so counts match what is actually on screen.
 */
export function daysInView(view: ViewKey, anchor: Date): Date[] {
  if (view === "day") return [anchor];
  if (view === "week") return weekOf(anchor);
  return buildMonthGrid(anchor).flat();
}

export function stepAnchor(view: ViewKey, anchor: Date, dir: -1 | 1): Date {
  if (view === "day") return addDays(anchor, dir);
  if (view === "week") return addDays(anchor, dir * 7);
  return addMonthsClamped(anchor, dir);
}

/* ----------------------------------------------------------------- hours */

export interface BusinessHours {
  /** Decimal hours the dealership opens and closes. */
  open: number;
  close: number;
}

// Falls back to 9am–6pm when the company hasn't set working hours (GEN-83).
const DEFAULT_HOURS: BusinessHours = { open: 9, close: 18 };

export function resolveHours(
  company: Pick<Company, "workingHoursStart" | "workingHoursEnd"> | null,
): BusinessHours {
  const open =
    typeof company?.workingHoursStart === "string" ? hmToDec(company.workingHoursStart) : NaN;
  const close =
    typeof company?.workingHoursEnd === "string" ? hmToDec(company.workingHoursEnd) : NaN;
  // Unset or inverted hours would draw a zero- or negative-height grid.
  if (!Number.isFinite(open) || !Number.isFinite(close) || close - open < 1) {
    return DEFAULT_HOURS;
  }
  return { open, close };
}

/**
 * The day and week grids run an hour either side of opening hours, shaded as
 * closed, so an early drop-off or a late job still has somewhere to show.
 */
export function gridWindow(hours: BusinessHours): { start: number; end: number } {
  return {
    start: Math.max(0, Math.floor(hours.open) - 1),
    end: Math.min(24, Math.ceil(hours.close) + 1),
  };
}

/** Half-hour start times within opening hours (workshop and maintenance). */
export function halfHourOptions(hours: BusinessHours): string[] {
  const n = Math.max(0, Math.floor((hours.close - hours.open) * 2));
  return Array.from({ length: n }, (_, i) => decToHm(hours.open + i / 2));
}

/** Whole-hour slots, the last one an hour before closing (appointments). */
export function hourlyOptions(hours: BusinessHours): string[] {
  const n = Math.max(0, Math.floor(hours.close - hours.open));
  return Array.from({ length: n }, (_, i) => decToHm(hours.open + i));
}

/* ---------------------------------------------------------------- events */

// Customer appointments are booked in 1-hour slots (UAT 2026-07-09).
export const APPT_DURATION = 1;
// Workshop and maintenance bookings store a start time but no duration, so
// they show as half-hour markers rather than invented 1h or 2h blocks.
export const MARKER_DURATION = 0.5;

export function buildEvents(input: {
  appts: Appointment[];
  shop: WorkshopJob[];
  maint: MaintenanceJob[];
  vehicles: Vehicle[];
}): CalEvent[] {
  const byId = new Map(input.vehicles.map((v) => [v.id, v]));
  const vehicle = (id: UUID | null) => {
    const v = id ? byId.get(id) : undefined;
    return v
      ? { reg: v.registration, car: titleCase(`${v.make} ${v.model}`) }
      : { reg: null, car: null };
  };

  const out: CalEvent[] = [];
  for (const a of input.appts) {
    const start = hmToDec(a.time);
    out.push({
      key: `appt-${a.id}`,
      kind: "appt",
      id: a.id,
      title: a.customerName,
      date: a.date,
      start,
      end: start + APPT_DURATION,
      allDay: false,
      ...vehicle(a.vehicleId),
      job: null,
      vehicleId: a.vehicleId,
      raw: a,
    });
  }
  for (const j of input.shop) {
    const start = hmToDec(j.scheduledTime);
    out.push({
      key: `workshop-${j.id}`,
      kind: "workshop",
      id: j.id,
      title: j.customerName,
      date: j.scheduledDate,
      start,
      end: start + MARKER_DURATION,
      allDay: false,
      reg: j.vehicleReg || null,
      car: j.vehicleDescription || null,
      job: j.description || null,
      vehicleId: null,
      raw: j,
    });
  }
  for (const j of input.maint) {
    if (!j.dueDate) continue;
    // Jobs booked before GEN-110 have no time: they belong in the all-day row,
    // and inventing a time would show a slot nobody booked.
    const start = j.scheduledTime ? hmToDec(j.scheduledTime) : 0;
    out.push({
      key: `maint-${j.id}`,
      kind: "maint",
      id: j.id,
      title: j.description,
      date: j.dueDate,
      start,
      end: j.scheduledTime ? start + MARKER_DURATION : 0,
      allDay: !j.scheduledTime,
      ...vehicle(j.vehicleId),
      job: null,
      vehicleId: j.vehicleId,
      raw: j,
    });
  }
  return out;
}

/** Earliest first; all-day items ahead of timed ones on the same day. */
export const byStart = (a: CalEvent, b: CalEvent): number =>
  Number(b.allDay) - Number(a.allDay) || a.start - b.start;

/** Finished: an earlier day, or today and already over. */
export function isPast(ev: CalEvent, todayISO: string, nowHour: number | null): boolean {
  if (!todayISO) return false;
  if (ev.date !== todayISO) return ev.date < todayISO;
  return !ev.allDay && nowHour !== null && ev.end <= nowHour;
}

/* ---------------------------------------------------------------- layout */

/**
 * A card never draws shorter than half an hour, so lanes treat anything
 * shorter as half an hour long; otherwise two cards could touch-overlap.
 */
const MIN_LAYOUT_SPAN = 0.5;

/**
 * Side-by-side lanes for overlapping timed events. Each cluster of events
 * that overlap one another shares the column's width; everything else gets
 * the full width.
 */
export function layoutLanes(
  events: Pick<CalEvent, "key" | "start" | "end">[],
): Map<string, { lane: number; lanes: number }> {
  const span = (e: Pick<CalEvent, "start" | "end">) => Math.max(e.end, e.start + MIN_LAYOUT_SPAN);
  const sorted = [...events].sort((a, b) => a.start - b.start || span(b) - span(a));
  const out = new Map<string, { lane: number; lanes: number }>();
  let cluster: { key: string; lane: number; end: number }[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const lanes = cluster.reduce((n, c) => Math.max(n, c.lane + 1), 1);
    for (const c of cluster) out.set(c.key, { lane: c.lane, lanes });
    cluster = [];
  };

  for (const e of sorted) {
    if (cluster.length && e.start >= clusterEnd) flush();
    const taken = new Set(cluster.filter((c) => c.end > e.start).map((c) => c.lane));
    let lane = 0;
    while (taken.has(lane)) lane++;
    const end = span(e);
    cluster.push({ key: e.key, lane, end });
    clusterEnd = Math.max(clusterEnd, end);
  }
  if (cluster.length) flush();
  return out;
}
