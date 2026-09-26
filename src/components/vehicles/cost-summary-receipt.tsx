"use client";

import type * as React from "react";
import { Card, Divider } from "@/components/polaris";
import { cn, formatCurrency } from "@/lib/utils";

interface Props {
  buyingPrice: number;
  feesAndCharges: number;
  stockingCharges: number;
  prepCosts: number;
  warranty: number;
  /** App-only charges below the sheet's total buying price. */
  otherCharges?: number;
  listingPrice: number | null;
  className?: string;
}

/**
 * Live cost summary for the Add vehicle form's sidebar. Uses the same roll-up
 * as the saved record: total buying (the master sheet's AI: price + fees + VAT
 * paid), then the app-only lines on top for the base cost; profit is the
 * listing price less the base cost.
 */
export function CostSummaryReceipt({
  buyingPrice,
  feesAndCharges,
  stockingCharges,
  prepCosts,
  warranty,
  otherCharges = 0,
  listingPrice,
  className,
}: Props) {
  // Total buying = the master sheet's AI (price + fees + VAT paid). Other
  // charges are not a sheet column, so they sit below it.
  const totalBuying = buyingPrice + feesAndCharges;
  const baseCost =
    totalBuying + otherCharges + stockingCharges + prepCosts + warranty;
  const profit = listingPrice !== null ? listingPrice - baseCost : null;
  const margin =
    profit !== null && listingPrice ? Math.round((profit / listingPrice) * 100) : null;

  return (
    <Card title="Cost summary" className={className}>
      <Group title="Costs">
        <Row label="Buying price" value={buyingPrice} />
        <Row label="Fees and charges" value={feesAndCharges} />
        {otherCharges > 0 && <Row label="Other charges" value={otherCharges} />}
        <Row label="Stocking" value={stockingCharges} />
        <Row label="Prep costs" value={prepCosts} />
        <Row label="Warranty" value={warranty} />
      </Group>

      <Divider />

      <div className="flex flex-col">
        <div className="flex items-baseline justify-between gap-3">
          <span className="heading-sm">Base cost</span>
          <span className="heading-md tabular-nums">{formatCurrency(baseCost)}</span>
        </div>
        {totalBuying !== baseCost && (
          <div className="flex items-baseline justify-between gap-3 body-sm text-(--text-secondary)">
            <span>Total buying</span>
            <span className="tabular-nums">{formatCurrency(totalBuying)}</span>
          </div>
        )}
      </div>

      <Divider />

      <Group
        title="Selling"
        after={
          profit === null ? (
            <p className="body-sm text-(--text-secondary)">Add a listing price to see profit</p>
          ) : null
        }
      >
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-md text-(--text-secondary)">Listing price</dt>
          <dd
            className={cn(
              "text-right body-md tabular-nums",
              listingPrice === null && "text-(--text-secondary)",
            )}
          >
            {listingPrice === null ? "Not set" : formatCurrency(listingPrice)}
          </dd>
        </div>
        {profit !== null && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="body-md-semibold">Estimated profit</dt>
            <dd
              className={cn(
                "text-right body-md-semibold tabular-nums",
                profit > 0 && "text-(--text-success)",
                profit < 0 && "text-(--text-critical)",
              )}
            >
              {formatCurrency(profit)}
              {margin !== null ? ` · ${margin}%` : ""}
            </dd>
          </div>
        )}
      </Group>
    </Card>
  );
}

function Group({
  title,
  after,
  children,
}: {
  title: string;
  /** Shown under the list, e.g. a hint in place of rows that can't be worked out yet. */
  after?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="body-sm-semibold text-(--text-secondary)">{title}</h3>
      <dl className="flex flex-col gap-1">{children}</dl>
      {after}
    </div>
  );
}

/** One cost line; a zero amount is muted so the lines that matter stand out. */
function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="body-md text-(--text-secondary)">{label}</dt>
      <dd
        className={cn(
          "text-right body-md tabular-nums",
          value === 0 ? "text-(--text-secondary)" : "text-(--text)",
        )}
      >
        {formatCurrency(value)}
      </dd>
    </div>
  );
}
