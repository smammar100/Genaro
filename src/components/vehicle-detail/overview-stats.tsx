"use client";

import { RefreshCw } from "lucide-react";
import type { Vehicle } from "@/lib/types";
import { Badge, Button, Card, type BadgeTone } from "@/components/genaro";
import { carMargin } from "@/lib/car-margin";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface OverviewStatsProps {
  vehicle: Vehicle;
  /** The live web price: the listing's when there is one, else the vehicle's. */
  webPrice: number;
  /** True while a valuation refresh is in flight. */
  refreshing?: boolean;
  /** Pulls a fresh AutoTrader valuation. Omit to hide Refresh. */
  onRefresh?: () => void;
}

/**
 * The Overview's figures in one card (the "stat strip", picked from the
 * vehicle overview prototypes, 26 Oct 2026). Web price, net profit, days in
 * stock and AutoTrader retail sit side by side, split by hairlines and 2 × 2
 * when the panel is narrow. Under them, AutoTrader's trade, part-ex and retail
 * on one line with when they were pulled and Refresh, then where the web
 * price sits on the trade → retail band once the car has a price. Sizes its
 * columns to the nearest `@container`.
 * @import import { OverviewStats } from "@/components/vehicle-detail/overview-stats";
 */
export function OverviewStats({
  vehicle,
  webPrice,
  refreshing = false,
  onRefresh,
}: OverviewStatsProps) {
  const floor = vehicle.minimumSalePrice ?? 0;
  const burn = vehicle.dailyChargeRate ?? 0;
  // Same figure as the Financials tab: one calculation, car-margin.ts.
  const profit = carMargin(vehicle, webPrice)?.profit ?? 0;
  const retail = vehicle.atRetailValuation ?? null;
  const daysTone =
    vehicle.daysInStock >= 90
      ? "text-(--text-critical)"
      : vehicle.daysInStock >= 60
        ? "text-(--text-caution)"
        : undefined;

  const tiles = [
    {
      label: "Web price",
      value: webPrice ? formatCurrency(webPrice) : "—",
      sub: floor ? `Floor ${formatCurrency(floor)}` : "No floor set",
    },
    {
      label: "Net profit (live)",
      value: profit > 0 ? formatCurrency(Math.round(profit)) : "—",
      sub: "After 20% VAT on the margin",
    },
    {
      label: "Days in stock",
      value: String(vehicle.daysInStock),
      sub: burn ? `Stocking burn ${formatCurrency(burn)} / day` : "—",
      tone: daysTone,
    },
    {
      label: "AT retail avg",
      value: retail != null ? formatCurrency(retail) : "—",
      sub: atRetailHint(webPrice, retail) ?? "Not yet valued",
    },
  ];

  const valuations = [
    ["Trade", vehicle.atTradeValuation],
    ["Part-ex", vehicle.atPartExchangeValuation],
    ["Retail", retail],
  ] as const;

  return (
    <Card padding="0">
      <div className="grid grid-cols-2 @3xl:grid-cols-4 [&>*]:border-(--border-secondary) [&>*:nth-child(even)]:border-l [&>*:nth-child(n+3)]:border-t @3xl:[&>*:nth-child(n+2)]:border-l @3xl:[&>*:nth-child(n+3)]:border-t-0">
        {tiles.map((t) => (
          <div key={t.label} className="flex min-w-0 flex-col gap-1 p-4">
            <div className="body-sm text-(--text-secondary)">{t.label}</div>
            <div className="heading-lg tabular-nums text-(--text)">{t.value}</div>
            <div className={cn("body-sm text-(--text-secondary)", t.tone)}>{t.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-(--border-secondary) bg-(--bg-surface-secondary) px-4 py-3">
        <div className="flex flex-col">
          <span className="body-md font-semibold text-(--text)">AutoTrader valuation</span>
          <span className="body-sm text-(--text-secondary)">
            {retail != null
              ? `${updatedLabel(vehicle.atValuationAt)} · live feed`
              : "Not yet valued, refresh to pull live"}
          </span>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 body-md">
          {valuations.map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-2">
              <dt className="text-(--text-secondary)">{label}</dt>
              <dd className="font-semibold tabular-nums text-(--text)">
                {value ? formatCurrency(value) : "—"}
              </dd>
            </div>
          ))}
        </dl>
        {onRefresh ? (
          <div className="ml-auto">
            <Button
              variant="plain"
              icon={<RefreshCw className={cn(refreshing && "animate-spin motion-reduce:animate-none")} />}
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        ) : null}
      </div>

      <PriceMeter
        webPrice={webPrice}
        trade={vehicle.atTradeValuation ?? null}
        retail={retail}
      />
    </Card>
  );
}

/** How our web price sits against AutoTrader retail. */
function atRetailHint(webPrice: number, retail: number | null): string | undefined {
  if (retail == null) return undefined;
  if (!webPrice) return "Live market retail";
  const ratio = webPrice / retail;
  if (ratio <= 0.97) return "Priced below market";
  if (ratio <= 1.03) return "Within market range";
  return "Above market";
}

/** Relative "Updated …" label from an ISO timestamp. */
function updatedLabel(iso: string | null | undefined): string {
  if (!iso) return "Not yet valued";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  return `Updated ${formatDate(iso)}`;
}

/**
 * Where our web price sits on the Trade → Retail band: a marker and a
 * tone-coded verdict. Hidden until we have both AutoTrader bounds and a web
 * price.
 */
function PriceMeter({
  webPrice,
  trade,
  retail,
}: {
  webPrice: number;
  trade: number | null;
  retail: number | null;
}) {
  if (!webPrice || trade == null || retail == null || retail <= trade) {
    return null;
  }
  const pos = Math.max(0, Math.min(1, (webPrice - trade) / (retail - trade))) * 100;
  const ratio = webPrice / retail;
  const verdict: { label: string; tone: BadgeTone } =
    ratio <= 0.97
      ? { label: "Below market", tone: "info" }
      : ratio <= 1.03
        ? { label: "Within market", tone: "success" }
        : { label: "Above market", tone: "attention" };

  return (
    <div className="border-t border-(--border-secondary) px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="body-md text-(--text-secondary)">Your price vs market</span>
        <Badge tone={verdict.tone}>{verdict.label}</Badge>
      </div>
      <div className="relative h-2 rounded-full bg-(--bg-fill-tertiary)">
        <div
          className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-(--bg-surface) bg-(--bg-fill-brand) shadow-(--shadow-100)"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between body-md tabular-nums text-(--text-secondary)">
        <span>Trade {formatCurrency(trade)}</span>
        <span className="heading-sm text-(--text)">You {formatCurrency(webPrice)}</span>
        <span>Retail {formatCurrency(retail)}</span>
      </div>
    </div>
  );
}
