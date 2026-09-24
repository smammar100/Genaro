"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { appointmentService } from "@/lib/services/appointment-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import type { Appointment, Vehicle } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#e3e3e3] bg-card shadow-[0_1px_0_rgba(0,0,0,.05)]">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Appointments
          </h2>
        </div>
        <Link
          className="text-[13px] text-[#005bd3] no-underline hover:underline"
          href="/sales/appointments"
        >
          View all
        </Link>
      </div>

      {upcoming === null ? (
        <div className="p-4">
          <Skeleton className="h-40" />
        </div>
      ) : upcoming.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
          <p className="text-[13px] text-muted-foreground">
            No upcoming appointments
          </p>
          <Link
            className="text-[13px] text-[#005bd3] no-underline hover:underline"
            href="/sales/appointments"
          >
            Book appointment
          </Link>
        </div>
      ) : (
        // No dividers between rows: spacing separates them (rule 1).
        <ul className="flex flex-1 list-none flex-col justify-between py-2 pb-3">
          {upcoming.map((a) => {
            const v = vehicles.find((x) => x.id === a.vehicleId);
            const { wd, dd } = chipParts(a.date);
            return (
              <li
                className="flex items-center gap-[11px] px-4 py-2.5"
                key={a.id}
              >
                {/* The one shadow in the system lives on this chip. */}
                <span className="flex w-[34px] shrink-0 flex-col overflow-hidden rounded-lg border border-[#e3e3e3] bg-card">
                  <span className="grid h-[13px] place-items-center bg-[#f1f1f1] text-[9px] font-semibold text-[#4a4a4a]">
                    {wd}
                  </span>
                  <span className="grid h-[25px] place-items-center text-[15px] font-semibold text-foreground tabular-nums">
                    {dd}
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
                  <span className="truncate text-[13px] font-medium">
                    {a.customerName}
                  </span>
                  <span className="truncate text-[12px] text-muted-foreground">
                    {v ? `${v.registration} · ${v.make} ${v.model}` : "—"}
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-[12px] font-medium text-[#4a4a4a] tabular-nums">
                  {fmtTime(a.time)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
