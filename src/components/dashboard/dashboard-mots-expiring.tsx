"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { vehicleService } from "@/lib/services/vehicle-service";
import type { Vehicle } from "@/lib/types";
import { Button, Card } from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { isInStock } from "@/lib/stock";
import { locationLabel } from "@/lib/locations";
import { useCompanyLocations } from "@/hooks/use-company-locations";
import { formatDate, titleCase } from "@/lib/utils";
import { vehicleDetailHref } from "@/lib/vehicle-nav";

/** How far ahead the box looks: under 60 days. */
const DAYS_AHEAD = 60;

/** Today as YYYY-MM-DD in the viewer's time zone. */
const dayKey = (d: Date) => d.toLocaleDateString("en-CA");

/**
 * Cars in stock whose MOT runs out in under 60 days, or already has, soonest
 * first; null while loading. The date is the car's MOT expiry, as on its
 * Documentation card. The dashboard reads this to decide whether the box
 * shows at all.
 */
export function useMotsExpiring(): { due: Vehicle[] | null; today: string } {
  const { company } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  // Read once the data lands, so rendering stays pure.
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    if (!company) return;
    void vehicleService.getAll(company.id).then((v) => {
      setVehicles(v);
      setToday(new Date());
    });
  }, [company]);

  const due = useMemo(() => {
    if (!vehicles || !today) return null;
    const until = dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + DAYS_AHEAD));
    return vehicles
      .filter((v) => isInStock(v) && v.motExpiry && v.motExpiry.slice(0, 10) < until)
      .sort((a, b) => (a.motExpiry ?? "").localeCompare(b.motExpiry ?? ""));
  }, [vehicles, today]);

  return { due, today: today ? dayKey(today) : "" };
}

/**
 * The cars from useMotsExpiring (call 2026-10-31): reg, car, where it is and
 * the date, in red. Only drawn when there is at least one, so the dashboard
 * has no empty box (2026-11-01).
 * @import import { DashboardMotsExpiring } from "@/components/dashboard/dashboard-mots-expiring";
 */
export function DashboardMotsExpiring({ due, today: todayKey }: { due: Vehicle[]; today: string }) {
  const pathname = usePathname();
  const custom = useCompanyLocations();

  return (
    <Card
      className="h-full"
      title="MOTs expiring soon"
    >
      {/* No dividers between rows: spacing separates them, as in Appointments. */}
      <ul className="-mx-2 flex list-none flex-col gap-1">
          {due.slice(0, 8).map((v) => {
            const expired = (v.motExpiry ?? "") < todayKey;
            return (
              <li key={v.id}>
                <Link
                  href={vehicleDetailHref(v.id, pathname)}
                  className="flex items-center gap-3 rounded-(--radius-200) px-2 py-1.5 transition-colors hover:bg-(--bg-surface-hover)"
                >
                  <RegPlate registration={v.registration} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="body-md truncate">{titleCase(`${v.make} ${v.model}`)}</span>
                    <span className="body-sm truncate text-(--text-secondary)">
                      {locationLabel(v.currentLocation, custom)}
                    </span>
                  </span>
                  <span className="body-sm-semibold shrink-0 text-right tabular-nums text-(--text-critical)">
                    {expired ? "Expired " : ""}
                    {formatDate(v.motExpiry)}
                  </span>
                </Link>
              </li>
            );
          })}
          {due.length > 8 ? (
            <li className="px-2 py-1.5">
              <Button variant="plain" url="/vehicles">
                {`${due.length - 8} more in All vehicles`}
              </Button>
            </li>
          ) : null}
      </ul>
    </Card>
  );
}
