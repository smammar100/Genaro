import { describe, expect, it } from "vitest";
import type { Appointment, MaintenanceJob, Vehicle, WorkshopJob } from "@/lib/types";
import {
  buildEvents,
  buildMonthGrid,
  daysInView,
  gridWindow,
  halfHourOptions,
  hourlyOptions,
  isPast,
  layoutLanes,
  resolveHours,
  stepAnchor,
  toISO,
  weekLabel,
  weekOf,
} from "./calendar-model";

const ev = (key: string, start: number, end: number) => ({ key, start, end });

describe("layoutLanes", () => {
  it("gives events that don't overlap the full width", () => {
    const lanes = layoutLanes([ev("a", 9, 10), ev("b", 10, 11)]);
    expect(lanes.get("a")).toEqual({ lane: 0, lanes: 1 });
    expect(lanes.get("b")).toEqual({ lane: 0, lanes: 1 });
  });

  it("splits overlapping events side by side", () => {
    const lanes = layoutLanes([ev("appt", 11, 12), ev("maint", 11, 11.5)]);
    expect(lanes.get("appt")).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get("maint")).toEqual({ lane: 1, lanes: 2 });
  });

  it("reuses a lane once it frees up inside the same cluster", () => {
    const lanes = layoutLanes([ev("long", 9, 12), ev("a", 9, 10), ev("b", 10, 11)]);
    expect(lanes.get("long")).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get("a")).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get("b")).toEqual({ lane: 1, lanes: 2 });
  });

  it("treats a zero-length marker as half an hour", () => {
    const lanes = layoutLanes([ev("a", 9, 9), ev("b", 9.25, 9.75)]);
    expect(lanes.get("a")?.lanes).toBe(2);
  });
});

describe("business hours", () => {
  it("reads the company's working hours", () => {
    expect(resolveHours({ workingHoursStart: "08:30", workingHoursEnd: "17:30" })).toEqual({
      open: 8.5,
      close: 17.5,
    });
  });

  it("falls back to 9–18 when the hours are missing or inverted", () => {
    expect(resolveHours(null)).toEqual({ open: 9, close: 18 });
    expect(resolveHours({ workingHoursStart: "18:00", workingHoursEnd: "09:00" })).toEqual({
      open: 9,
      close: 18,
    });
  });

  it("pads the grid by an hour either side, within the day", () => {
    expect(gridWindow({ open: 9, close: 18 })).toEqual({ start: 8, end: 19 });
    expect(gridWindow({ open: 8.5, close: 17.5 })).toEqual({ start: 7, end: 19 });
    expect(gridWindow({ open: 0, close: 24 })).toEqual({ start: 0, end: 24 });
  });

  it("offers hourly appointment slots and half-hour job slots", () => {
    expect(hourlyOptions({ open: 9, close: 12 })).toEqual(["09:00", "10:00", "11:00"]);
    expect(halfHourOptions({ open: 9, close: 10.5 })).toEqual(["09:00", "09:30", "10:00"]);
  });
});

describe("dates", () => {
  const sat = new Date(2026, 8, 26);

  it("starts weeks on Monday", () => {
    const week = weekOf(sat);
    expect(toISO(week[0])).toBe("2026-09-21");
    expect(toISO(week[6])).toBe("2026-09-27");
  });

  it("covers the month in whole weeks", () => {
    const grid = buildMonthGrid(sat);
    expect(grid).toHaveLength(5);
    expect(toISO(grid[0][0])).toBe("2026-08-31");
    expect(toISO(grid[4][6])).toBe("2026-10-04");
    expect(daysInView("month", sat)).toHaveLength(35);
  });

  it("labels weeks within and across months", () => {
    expect(weekLabel(weekOf(sat))).toBe("21 – 27 September 2026");
    expect(weekLabel(weekOf(new Date(2026, 8, 30)))).toBe("28 Sep – 4 Oct 2026");
  });

  it("steps by a day, a week or a month", () => {
    expect(toISO(stepAnchor("day", sat, 1))).toBe("2026-09-27");
    expect(toISO(stepAnchor("week", sat, -1))).toBe("2026-09-19");
    expect(toISO(stepAnchor("month", new Date(2026, 0, 31), 1))).toBe("2026-02-28");
  });
});

describe("buildEvents", () => {
  const vehicle = { id: "v1", registration: "RK69KRT", make: "BMW", model: "X1" } as Vehicle;
  const events = buildEvents({
    vehicles: [vehicle],
    appts: [{ id: "a1", vehicleId: "v1", customerName: "Hina Mockford", date: "2026-09-26", time: "11:00" } as Appointment],
    shop: [
      {
        id: "w1",
        customerName: "Oscar Mockford",
        vehicleReg: "EF34 GHJ",
        vehicleDescription: "Vauxhall Corsa 1.2",
        description: "MOT + brake check",
        scheduledDate: "2026-09-26",
        scheduledTime: "10:30",
      } as WorkshopJob,
    ],
    maint: [
      { id: "m1", vehicleId: "v1", description: "Key battery low", dueDate: "2026-09-26", scheduledTime: null } as MaintenanceJob,
      { id: "m2", vehicleId: "v1", description: "No due date", dueDate: null, scheduledTime: null } as MaintenanceJob,
    ],
  });

  it("books appointments for an hour and links the stock car", () => {
    const appt = events.find((e) => e.key === "appt-a1");
    expect(appt).toMatchObject({ start: 11, end: 12, reg: "RK69KRT", car: "BMW X1", vehicleId: "v1" });
  });

  it("keeps the walk-in's own car and job", () => {
    expect(events.find((e) => e.key === "workshop-w1")).toMatchObject({
      start: 10.5,
      end: 11,
      reg: "EF34 GHJ",
      car: "Vauxhall Corsa 1.2",
      job: "MOT + brake check",
    });
  });

  it("puts untimed maintenance in the all-day row and skips jobs with no due date", () => {
    expect(events.find((e) => e.key === "maint-m1")?.allDay).toBe(true);
    expect(events.some((e) => e.key === "maint-m2")).toBe(false);
  });

  it("knows what is already over", () => {
    const appt = events.find((e) => e.key === "appt-a1")!;
    expect(isPast(appt, "2026-09-27", 9)).toBe(true);
    expect(isPast(appt, "2026-09-26", 11.5)).toBe(false);
    expect(isPast(appt, "2026-09-26", 12)).toBe(true);
    expect(isPast(appt, "", null)).toBe(false);
  });
});
