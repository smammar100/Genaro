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
  /** Optional help line under the totals. */
  children?: React.ReactNode;
}

/**
 * Live cost summary for the Add vehicle form's sidebar. Uses the same roll-up
 * as the saved record: total buying (the master sheet's AI: price + fees + VAT
 * paid), then the app-only lines on top for the base cost.
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
  children,
}: Props) {
  // Total buying = the master sheet's AI (price + fees + VAT paid). Other
  // charges are not a sheet column, so they sit below it.
  const totalBuying = buyingPrice + feesAndCharges;
  const baseCost =
    totalBuying + otherCharges + stockingCharges + prepCosts + warranty;
  const profit = listingPrice !== null ? listingPrice - baseCost : null;

  return (
    <Card title="Cost summary" className={className}>
      <dl className="flex flex-col gap-1">
        <Row
          label="Buying price"
          hint="Negotiated purchase amount"
          value={buyingPrice}
        />
        <Row
          label="Fees and charges"
          hint="BCA fees, collection, delivery and VAT paid"
          value={feesAndCharges}
        />
        {otherCharges > 0 && <Row label="Other charges" value={otherCharges} />}
        <Row label="Stocking" value={stockingCharges} />
        <Row label="Prep costs" value={prepCosts} />
        <Row label="Warranty" value={warranty} />
      </dl>
      <Divider />
      <dl className="flex flex-col gap-1">
        <Row label="Total buying" value={totalBuying} bold />
        <Row label="Base cost" value={baseCost} bold />
      </dl>
      <Divider />
      <dl className="flex flex-col gap-1">
        <Row
          label="Listing price"
          value={listingPrice}
          tone={listingPrice !== null && listingPrice > 0 ? "neutral" : "muted"}
        />
        <Row
          label="Estimated profit"
          value={profit}
          tone={
            profit === null
              ? "muted"
              : profit > 0
                ? "positive"
                : profit < 0
                  ? "negative"
                  : "neutral"
          }
          bold
        />
      </dl>
      {children}
    </Card>
  );
}

function Row({
  label,
  hint,
  value,
  bold,
  tone,
}: {
  label: string;
  hint?: string;
  value: number | null;
  bold?: boolean;
  tone?: "positive" | "negative" | "muted" | "neutral";
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt
        className={cn(
          "text-sm text-(--text-secondary)",
          bold && "font-semibold text-(--text)",
        )}
      >
        {label}
        {hint ? (
          <span className="block text-xs font-normal text-(--text-secondary)">
            {hint}
          </span>
        ) : null}
      </dt>
      <dd
        className={cn(
          "text-right text-sm tabular-nums text-(--text)",
          bold && "font-semibold",
          tone === "positive" && "text-(--text-success)",
          tone === "negative" && "text-(--text-critical)",
          tone === "muted" && "text-(--text-secondary)",
        )}
      >
        {formatCurrency(value)}
      </dd>
    </div>
  );
}
