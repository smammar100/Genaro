import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { makeVehicle } from "@/test/factories";
import type { Appointment } from "@/lib/types";
import { DashboardUpcomingAppointments, dateParts } from "./dashboard-upcoming-appointments";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ company: { id: "co-0001" }, user: { id: "user-9" } }),
}));

const appts = vi.hoisted(() => ({ getAll: vi.fn() }));
vi.mock("@/lib/services/appointment-service", () => ({ appointmentService: appts }));
const cars = vi.hoisted(() => ({ getAll: vi.fn() }));
vi.mock("@/lib/services/vehicle-service", () => ({ vehicleService: cars }));

const appt = (o: Partial<Appointment>) =>
  ({ id: o.id, status: "upcoming", vehicleId: "veh-q7", customerName: "Marcell Lames", ...o }) as Appointment;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T09:00:00"));
  cars.getAll.mockResolvedValue([
    makeVehicle({ id: "veh-q7", registration: "YJ72 HFS", make: "AUDI", model: "Q7" }),
  ]);
  appts.getAll.mockResolvedValue([
    appt({ id: "a1", date: "2026-09-15", time: "10:00", customerName: "Jaideep" }),
    appt({ id: "a2", date: "2026-11-07", time: "12:30" }),
  ]);
});

afterEach(() => vi.useRealTimers());

describe("DashboardUpcomingAppointments", () => {
  it("puts the month over the day in the chip, and the weekday right below the time", async () => {
    render(<DashboardUpcomingAppointments />);
    const rows = await screen.findAllByRole("listitem");
    expect(rows).toHaveLength(2);

    const sat = rows[1];
    // Chip: month band, then the day.
    expect(within(sat).getByText("Nov").nextElementSibling).toHaveTextContent(/^7$/);
    // Right column: the time, then its weekday under it.
    const time = within(sat).getByText("12:30 pm");
    expect(time.nextElementSibling).toHaveTextContent(/^Sat$/);
    expect(time.parentElement).toHaveClass("flex-col");

    const tue = rows[0];
    expect(within(tue).getByText("Sep").nextElementSibling).toHaveTextContent(/^15$/);
    expect(within(tue).getByText("10:00 am").nextElementSibling).toHaveTextContent(/^Tue$/);
  });

  it("shows the weekday once per row, under the time, not in the chip", async () => {
    render(<DashboardUpcomingAppointments />);
    const rows = await screen.findAllByRole("listitem");
    expect(within(rows[1]).getAllByText("Sat")).toHaveLength(1);
  });
});

describe("dateParts", () => {
  it.each([
    ["2026-01-05", "Jan", "5", "Mon"],
    ["2026-02-28", "Feb", "28", "Sat"],
    ["2026-09-15", "Sep", "15", "Tue"],
    ["2026-11-06", "Nov", "6", "Fri"],
    ["2026-12-31", "Dec", "31", "Thu"],
  ])("%s → %s %s, %s", (iso, month, day, weekday) => {
    expect(dateParts(iso)).toEqual({ month, day, weekday });
  });

  it("writes every month in three letters", () => {
    const months = Array.from({ length: 12 }, (_, i) => dateParts(`2026-${String(i + 1).padStart(2, "0")}-01`).month);
    expect(months).toEqual(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
  });
});
