"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { salesService } from "@/lib/services/sales-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import type { SalesDeal, SalesStage, Vehicle } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { cn, formatCurrency, titleCase } from "@/lib/utils";
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

/** Stage badge colours, lifted from Dashboard Home.dc.html. Deal stage is a
 *  position in a sequence, so the set is wider than the three status hues. */
const STAGE: Record<SalesStage, { label: string; bg: string; fg: string }> = {
  new_lead: { label: "New lead", bg: "#d5ebff", fg: "#003a5a" },
  contacted: { label: "Contacted", bg: "#d5ebff", fg: "#003a5a" },
  test_drive: { label: "Test drive", bg: "#ffeb78", fg: "#4f4700" },
  offer_made: { label: "Offer made", bg: "#ffeb78", fg: "#4f4700" },
  deposit_taken: { label: "Deposit taken", bg: "#ebebeb", fg: "#303030" },
  collection_delivery: { label: "Collection", bg: "#ebebeb", fg: "#303030" },
  completed_sale: { label: "Completed", bg: "#affebf", fg: "#014b40" },
  lost: { label: "Lost", bg: "#fed1d7", fg: "#8e0b21" },
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
  const router = useRouter();
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
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#e3e3e3] bg-card shadow-[0_1px_0_rgba(0,0,0,.05)]">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Recent deals
          </h2>
        </div>
        <Link
          className="text-[13px] text-[#005bd3] no-underline hover:underline"
          href="/sales/deals"
        >
          View all deals
        </Link>
      </div>

      {rows === null ? (
        <div className="p-4">
          <Skeleton className="h-64" />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-[13px] leading-[1.55] text-[#4a4a4a]">
          No deals have moved this week. A deal appears here as soon as a lead
          is contacted, a test drive is booked, or a deposit is taken.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              {/* One bottom border on the header; the rows below carry none —
                  they are separated by the alternating tone instead. */}
              <tr className="border-y border-[#e3e3e3] bg-[#f7f7f7] text-left text-xs text-[#4a4a4a]">
                <th className="py-2 pr-3 pl-4 font-medium">Vehicle</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 text-right font-medium">Days</th>
                <th className="px-3 py-2 text-right font-medium">Margin</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="py-2 pr-4 pl-3 text-right font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const stage = STAGE[r.stage];
                return (
                  <tr
                    className={cn(
                      "cursor-pointer border-t border-[#e3e3e3] transition-colors first:border-t-0 hover:bg-[#f7f7f7]",
                                          )}
                    key={r.id}
                    onClick={() =>
                      r.vehicle &&
                      router.push(vehicleDetailHref(r.vehicle.id, pathname))
                    }
                  >
                    <td className="py-2 pr-3 pl-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {r.vehicle ? (
                          <VehicleImage
                            className="h-[33px] w-[44px] shrink-0 rounded-sm"
                            variant="thumb"
                            vehicle={r.vehicle}
                          />
                        ) : (
                          <span className="h-[33px] w-[44px] shrink-0 rounded-sm bg-page" />
                        )}
                        <div className="min-w-0 leading-[1.3]">
                          <div className="text-[13px] font-semibold text-foreground">
                            {r.vehicle?.registration ?? "—"}
                          </div>
                          <div className="truncate text-[13px] text-muted-foreground">
                            {r.vehicle
                              ? titleCase(`${r.vehicle.make} ${r.vehicle.model}`)
                              : "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">{r.customerName}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex h-5 items-center whitespace-nowrap rounded-lg px-2 text-xs font-medium"
                        style={{ background: stage.bg, color: stage.fg }}
                      >
                        {stage.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#4a4a4a] tabular-nums">
                      {r.days === null ? "—" : `${r.days}d`}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {r.margin === null ? "—" : formatCurrency(r.margin)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {formatCurrency(r.total)}
                    </td>
                    {/* nowrap: the column is narrow enough that "09 Jul"
                        otherwise breaks onto two lines on every row (GEN-44) */}
                    <td className="whitespace-nowrap py-2.5 pr-4 pl-3 text-right text-muted-foreground tabular-nums">
                      {fmtDate(r.date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-[#e3e3e3] px-4 py-2 text-[13px] text-muted-foreground">
            {formatCurrency(shownTotal)} agreed across these deals
          </div>
        </div>
      )}
    </div>
  );
}
