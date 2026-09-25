"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { vehicleService } from "@/lib/services/vehicle-service";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import { Button, Card, SkeletonBodyText } from "@/components/polaris";

/** Active stock broken into four pipeline buckets, drawn in Polaris fill tokens. */
const BUCKETS: { label: string; token: string; statuses: VehicleStatus[] }[] = [
  {
    label: "Ready to sell",
    token: "var(--bg-fill-success)",
    statuses: ["ready", "listed", "reserved"],
  },
  {
    label: "In preparation",
    token: "var(--bg-fill-caution)",
    statuses: ["being_prepared"],
  },
  {
    label: "Awaiting inspection",
    token: "var(--bg-fill-info)",
    statuses: ["received", "inspection_pending"],
  },
  {
    label: "Photography",
    token: "var(--bg-fill-tertiary-active)",
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
    <Card
      className="h-full"
      title="Stock by stage"
      actions={
        <Button variant="plain" url="/vehicles">
          Inventory
        </Button>
      }
    >
      {segments === null ? (
        <SkeletonBodyText lines={5} />
      ) : total === 0 ? (
        // Rule 6: name the thing that is absent and the condition that would
        // put it there.
        <p className="body-md px-2 py-6 text-center text-(--text-secondary)">
          No cars are in the pipeline. Vehicles appear here from the moment they
          are booked in, and move between stages as prep and photography
          complete.
        </p>
      ) : (
        // Shopify-style: one horizontal stacked bar + a plain legend list.
        <div className="flex flex-1 flex-col gap-3 pt-1">
          <div
            className="flex h-2 w-full overflow-hidden rounded-full bg-(--bg-fill-secondary)"
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
                  className="h-full border-r-2 border-(--bg-surface) last:border-r-0"
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
                className="body-md flex items-center gap-2 border-t border-(--border-secondary) py-2 first:border-t-0"
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: seg.token }}
                />
                <span className="min-w-0 flex-1 truncate text-(--text)">
                  {seg.label}
                </span>
                <span className="body-md-semibold text-(--text) tabular-nums">
                  {seg.value}
                </span>
                <span className="w-10 text-right text-(--text-secondary) tabular-nums">
                  {`${Math.round((seg.value / total) * 100)}%`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
