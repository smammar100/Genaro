"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { vehicleService } from "@/lib/services/vehicle-service";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

/** Active stock broken into four pipeline buckets, in muted Polaris tones. */
const BUCKETS: { label: string; token: string; statuses: VehicleStatus[] }[] = [
  {
    label: "Ready to sell",
    token: "#29845a",
    statuses: ["ready", "listed", "reserved"],
  },
  {
    label: "In preparation",
    token: "#d4a72c",
    statuses: ["being_prepared"],
  },
  {
    label: "Awaiting inspection",
    token: "#4a8fc7",
    statuses: ["received", "inspection_pending"],
  },
  {
    label: "Photography",
    token: "#b5b5b5",
    statuses: ["photos_pending", "photos_ready"],
  },
];

/* --------------------------------------------------------------- widget */

export function DashboardStockOverview() {
  const { company } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);

  useEffect(() => {
    if (!company) return;
    void vehicleService.getAll(company.id).then(setVehicles);
  }, [company]);

  const { segments, total } = useMemo(() => {
    if (!vehicles) return { segments: null, total: 0 };
    const counted = BUCKETS.map((b) => ({
      label: b.label,
      token: b.token,
      value: vehicles.filter((v) => b.statuses.includes(v.status)).length,
    }));
    return {
      segments: counted,
      total: counted.reduce((sum, b) => sum + b.value, 0),
    };
  }, [vehicles]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#e3e3e3] bg-card shadow-[0_1px_0_rgba(0,0,0,.05)]">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Stock by stage
          </h2>
        </div>
        <Link
          className="text-[13px] text-[#005bd3] no-underline hover:underline"
          href="/vehicles"
        >
          Inventory
        </Link>
      </div>

      {segments === null ? (
        <div className="p-4">
          <Skeleton className="h-48" />
        </div>
      ) : total === 0 ? (
        // Rule 6: name the thing that is absent and the condition that would
        // put it there.
        <p className="px-6 py-10 text-center text-[13px] leading-[1.55] text-[#4a4a4a]">
          No cars are in the pipeline. Vehicles appear here from the moment they
          are booked in, and move between stages as prep and photography
          complete.
        </p>
      ) : (
        // Shopify-style: one horizontal stacked bar + a plain legend list.
        <div className="flex flex-1 flex-col gap-3 px-4 pt-1 pb-4">
          <div
            className="flex h-2 w-full overflow-hidden rounded-full bg-[#ebebeb]"
            role="img"
            aria-label={segments
              .map((seg) => `${seg.label}: ${seg.value}`)
              .join(", ")}
          >
            {segments
              .filter((seg) => seg.value > 0)
              .map((seg) => (
                <span
                  key={seg.label}
                  className="h-full border-r-2 border-card last:border-r-0"
                  style={{
                    width: `${(seg.value / total) * 100}%`,
                    background: seg.token,
                  }}
                />
              ))}
          </div>
          <ul className="flex list-none flex-col">
            {segments.map((seg) => (
              <li
                key={seg.label}
                className="flex items-center gap-2 border-t border-[#ebebeb] py-2 text-[13px] first:border-t-0"
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: seg.token }}
                />
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {seg.label}
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {seg.value}
                </span>
                <span className="w-10 text-right text-muted-foreground tabular-nums">
                  {`${Math.round((seg.value / total) * 100)}%`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
