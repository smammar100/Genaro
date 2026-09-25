"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { salesService } from "@/lib/services/sales-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import type { SalesDeal, SalesStage, Vehicle } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Link,
  SkeletonBodyText,
  type BadgeTone,
} from "@/components/polaris";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { formatCurrency, titleCase } from "@/lib/utils";
import { vehicleDetailHref } from "@/lib/vehicle-nav";

interface DealRow extends SalesDeal {
  vehicle: Vehicle | null;
  total: number | null;
  /** Realised margin. grossEarning when the books have it, else agreed price
   *  less base cost. Null when neither is known — shown as an em dash, never
   *  as a zero, because "no margin recorded" and "no margin" differ. */
  margin: number | null;
  days: number | null;
  date: string;
}

/** Deal stage → Polaris Badge. Stage is a position in a sequence: early
 *  contact reads as info, the live negotiation as attention, the paperwork
 *  stages neutral, and only the two end states carry success / critical. */
const STAGE: Record<SalesStage, { label: string; tone?: BadgeTone }> = {
  new_lead: { label: "New lead", tone: "info" },
  contacted: { label: "Contacted", tone: "info" },
  test_drive: { label: "Test drive", tone: "attention" },
  offer_made: { label: "Offer made", tone: "attention" },
  deposit_taken: { label: "Deposit taken" },
  collection_delivery: { label: "Collection" },
  completed_sale: { label: "Completed", tone: "success" },
  lost: { label: "Lost", tone: "critical" },
};

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export function DashboardRecentDeals() {
  const { company } = useAuth();
  const pathname = usePathname();
  const [deals, setDeals] = useState<SalesDeal[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (!company) return;
    void Promise.all([
      salesService.getAll(company.id),
      vehicleService.getAll(company.id),
    ]).then(([d, v]) => {
      setDeals(d);
      setVehicles(v);
    });
  }, [company]);

  const rows = useMemo<DealRow[] | null>(() => {
    if (!deals) return null;
    return [...deals]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
      .map((d) => {
        const dt =
          d.completionDate ?? d.depositDate ?? d.collectionDate ?? d.updatedAt;
        const vehicle = vehicles.find((v) => v.id === d.vehicleId) ?? null;
        const total = d.agreedPrice ?? d.offerPrice;
        const margin =
          vehicle?.grossEarning ??
          (total !== null && vehicle ? total - vehicle.baseCost : null);
        return {
          ...d,
          vehicle,
          total,
          margin,
          days: vehicle?.daysInStock ?? null,
          date: dt.slice(0, 10),
        };
      });
  }, [deals, vehicles]);

  // Rule 3: the card's own header carries the comparison for the rows below.
  //
  // The design reads "6 this week", but the query is the six most recently
  // updated deals with no date window on it — so that label would be a claim
  // the data does not make. It says what is actually on screen instead.
  const shownTotal = (rows ?? []).reduce((sum, r) => sum + (r.total ?? 0), 0);

  return (
    <Card padding="0">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
        <h2 className="heading-sm text-(--text)">Recent deals</h2>
        <Button variant="plain" url="/sales/deals">
          View all deals
        </Button>
      </div>

      {rows === null ? (
        <div className="px-4 pb-4">
          <SkeletonBodyText lines={6} />
        </div>
      ) : rows.length === 0 ? (
        <p className="body-md px-6 pt-6 pb-10 text-center text-(--text-secondary)">
          No deals have moved this week. A deal appears here as soon as a lead
          is contacted, a test drive is booked, or a deposit is taken.
        </p>
      ) : (
        <DataTable
          // The card above draws the surface; the table sits flush inside it.
          className="rounded-none shadow-none"
          columnContentTypes={[
            "text",
            "text",
            "text",
            "numeric",
            "numeric",
            "numeric",
            "numeric",
          ]}
          headings={["Vehicle", "Customer", "Stage", "Days", "Margin", "Total", "Date"]}
          rows={rows.map((r) => {
            const stage = STAGE[r.stage];
            return [
              <div className="flex min-w-0 items-center gap-2.5" key="vehicle">
                {r.vehicle ? (
                  <VehicleImage
                    className="h-8 w-11 shrink-0 rounded-(--radius-100)"
                    variant="thumb"
                    vehicle={r.vehicle}
                  />
                ) : (
                  <span className="h-8 w-11 shrink-0 rounded-(--radius-100) bg-(--bg-surface-secondary)" />
                )}
                <div className="min-w-0">
                  {r.vehicle ? (
                    <Link
                      url={vehicleDetailHref(r.vehicle.id, pathname)}
                      monochrome
                      removeUnderline
                    >
                      <span className="body-md-semibold">
                        {r.vehicle.registration}
                      </span>
                    </Link>
                  ) : (
                    <div className="body-md-semibold">—</div>
                  )}
                  <div className="truncate text-(--text-secondary)">
                    {r.vehicle
                      ? titleCase(`${r.vehicle.make} ${r.vehicle.model}`)
                      : "—"}
                  </div>
                </div>
              </div>,
              r.customerName,
              <Badge key="stage" tone={stage.tone}>
                {stage.label}
              </Badge>,
              <span className="text-(--text-secondary)" key="days">
                {r.days === null ? "—" : `${r.days}d`}
              </span>,
              r.margin === null ? "—" : formatCurrency(r.margin),
              formatCurrency(r.total),
              <span className="text-(--text-secondary)" key="date">
                {fmtDate(r.date)}
              </span>,
            ];
          })}
          footerContent={`${formatCurrency(shownTotal)} agreed across these deals`}
        />
      )}
    </Card>
  );
}
