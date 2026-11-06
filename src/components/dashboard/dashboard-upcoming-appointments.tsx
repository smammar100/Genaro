"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { appointmentService } from "@/lib/services/appointment-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import type { Appointment, Vehicle } from "@/lib/types";
import { Button, Card, EmptyState, EmptyStateIllustration, SkeletonBodyText } from "@/components/genaro";

function fmtTime(t: string): string {
  const [h, m] = t.split(":");
  const hh = Number(h);
  const period = hh >= 12 ? "pm" : "am";
  return `${hh % 12 || 12}:${m} ${period}`;
}

/** Three letters every month, Jan to Dec: en-GB would write September "Sept". */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A date's parts: month over the day in the calendar chip, the weekday under
 * the time (6 Nov 2026).
 */
export function dateParts(iso: string): { month: string; day: string; weekday: string } {
  const [y, mo, d] = iso.split("-").map(Number);
  return {
    month: MONTHS[mo - 1],
    day: String(d),
    weekday: new Date(y, mo - 1, d).toLocaleDateString("en-GB", { weekday: "short" }),
  };
}

export function DashboardUpcomingAppointments() {
  const { company } = useAuth();
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (!company) return;
    void Promise.all([
      appointmentService.getAll(company.id),
      vehicleService.getAll(company.id),
    ]).then(([a, v]) => {
      setAppts(a);
      setVehicles(v);
    });
  }, [company]);

  const upcoming = useMemo(() => {
    if (!appts) return null;
    const todayKey = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local
    return appts
      .filter((a) => a.status === "upcoming" && a.date >= todayKey)
      .slice(0, 5);
  }, [appts]);

  return (
    <Card
      className="h-full"
      title="Appointments"
      actions={
        <Button variant="plain" url="/sales/appointments">
          View all
        </Button>
      }
    >
      {upcoming === null ? (
        <SkeletonBodyText lines={5} />
      ) : upcoming.length === 0 ? (
        <EmptyState
          compact
          illustration={<EmptyStateIllustration variant="calendar" size="small" />}
          heading="No upcoming appointments"
          footerContent={
            <Button variant="plain" url="/sales/appointments">
              Book appointment
            </Button>
          }
        />
      ) : (
        // No dividers between rows: spacing separates them (rule 1).
        <ul className="flex list-none flex-col gap-1">
          {upcoming.map((a) => {
            const v = vehicles.find((x) => x.id === a.vehicleId);
            const { month, day, weekday } = dateParts(a.date);
            return (
              <li className="flex items-center gap-3 py-1.5" key={a.id}>
                {/* Calendar chip: month band over the day. The band is a
                    caption's full 16px line, so the month isn't clipped. */}
                <span className="flex w-9 shrink-0 flex-col overflow-hidden rounded-(--radius-200) border border-(--border) bg-(--bg-surface)">
                  <span className="body-sm grid h-4 place-items-center bg-(--bg-surface-secondary) text-(--text-secondary)">
                    {month}
                  </span>
                  <span className="heading-sm grid h-6 place-items-center text-(--text) tabular-nums">
                    {day}
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="body-md truncate text-(--text)">
                    {a.customerName}
                  </span>
                  <span className="body-sm truncate text-(--text-secondary)">
                    {v ? `${v.registration} · ${v.make} ${v.model}` : "—"}
                  </span>
                </span>
                {/* The time, with its weekday right below it. */}
                <span className="body-sm flex shrink-0 flex-col items-end whitespace-nowrap text-(--text-secondary) tabular-nums">
                  <span>{fmtTime(a.time)}</span>
                  <span>{weekday}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
