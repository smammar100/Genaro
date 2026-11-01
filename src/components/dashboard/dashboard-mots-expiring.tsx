"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { vehicleService } from "@/lib/services/vehicle-service";
import type { Vehicle } from "@/lib/types";
import { Button, Card, SkeletonBodyText } from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { isInStock } from "@/lib/stock";
import { locationLabel } from "@/lib/locations";
import { useCompanyLocations } from "@/hooks/use-company-locations";
import { formatDate, titleCase } from "@/lib/utils";
import { vehicleDetailHref } from "@/lib/vehicle-nav";

/** How far ahead the box looks: the client's "next two months". */
const MONTHS_AHEAD = 2;

/** Today as YYYY-MM-DD in the viewer's time zone. */
const dayKey = (d: Date) => d.toLocaleDateString("en-CA");

/**
 * Cars in stock whose MOT runs out in the next two months, or already has,
 * soonest first (call 2026-10-31): reg, car, where it is and the date, in
 * red. The dates are refreshed weekly from DVSA.
 * @import import { DashboardMotsExpiring } from "@/components/dashboard/dashboard-mots-expiring";
 */
export function DashboardMotsExpiring() {
  const { company } = useAuth();
  const pathname = usePathname();
  const custom = useCompanyLocations();
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
    const until = dayKey(new Date(today.getFullYear(), today.getMonth() + MONTHS_AHEAD, today.getDate()));
    return vehicles
      .filter((v) => isInStock(v) && v.motExpiry && v.motExpiry.slice(0, 10) <= until)
      .sort((a, b) => (a.motExpiry ?? "").localeCompare(b.motExpiry ?? ""));
  }, [vehicles, today]);

  const todayKey = today ? dayKey(today) : "";

  return (
    <Card
      className="h-full"
      title="MOTs expiring soon"
      actions={
        due && due.length > 0 ? (
          <span className="body-sm tabular-nums text-(--text-secondary)">{due.length}</span>
        ) : undefined
      }
    >
      {due === null ? (
        <SkeletonBodyText lines={5} />
      ) : due.length === 0 ? (
        <p className="body-md text-(--text-secondary)">
          No MOT runs out in the next two months.
        </p>
      ) : (
        <ul className="-mx-4 -mb-4 flex flex-col">
          {due.slice(0, 8).map((v) => {
            const expired = (v.motExpiry ?? "") < todayKey;
            return (
              <li key={v.id} className="border-t border-(--border-secondary)">
                <Link
                  href={vehicleDetailHref(v.id, pathname)}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-(--bg-surface-hover)"
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
            <li className="border-t border-(--border-secondary) px-4 py-2.5">
              <Button variant="plain" url="/vehicles">
                {`${due.length - 8} more in All vehicles`}
              </Button>
            </li>
          ) : null}
        </ul>
      )}
    </Card>
  );
}
