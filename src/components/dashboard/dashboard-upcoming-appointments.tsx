"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { appointmentService } from "@/lib/services/appointment-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import type { Appointment, Vehicle } from "@/lib/types";
import { Button, Card, SkeletonBodyText } from "@/components/polaris";

function fmtTime(t: string): string {
  const [h, m] = t.split(":");
  const hh = Number(h);
  const period = hh >= 12 ? "pm" : "am";
  return `${hh % 12 || 12}:${m} ${period}`;
}

/** Weekday + date for the calendar chip, split so the chip can band them. */
function chipParts(iso: string): { wd: string; dd: string } {
  const [y, mo, d] = iso.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  return {
    wd: dt.toLocaleDateString("en-GB", { weekday: "short" }),
    dd: String(d),
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
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-6 text-center">
          <p className="body-md text-(--text-secondary)">
            No upcoming appointments
          </p>
          <Button variant="plain" url="/sales/appointments">
            Book appointment
          </Button>
        </div>
      ) : (
        // No dividers between rows: spacing separates them (rule 1).
        <ul className="flex flex-1 list-none flex-col justify-between gap-1">
          {upcoming.map((a) => {
            const v = vehicles.find((x) => x.id === a.vehicleId);
            const { wd, dd } = chipParts(a.date);
            return (
              <li className="flex items-center gap-3 py-1.5" key={a.id}>
                {/* Calendar chip: weekday band over the date. */}
                <span className="flex w-9 shrink-0 flex-col overflow-hidden rounded-(--radius-200) border border-(--border) bg-(--bg-surface)">
                  <span className="grid h-3.5 place-items-center bg-(--bg-surface-secondary) text-2xs font-semibold text-(--text-secondary)">
                    {wd}
                  </span>
                  <span className="heading-sm grid h-6 place-items-center text-(--text) tabular-nums">
                    {dd}
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
                <span className="body-sm shrink-0 whitespace-nowrap text-(--text-secondary) tabular-nums">
                  {fmtTime(a.time)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
