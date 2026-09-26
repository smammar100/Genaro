"use client";

import { CostSummaryReceipt } from "../cost-summary-receipt";

/**
 * The sidebar's live cost summary: the lines, total buying and base cost,
 * then the listing price and the margin at it (estimated profit). The
 * figures come from ArrivalForm's roll-up (vehicle-costs.ts).
 */
export function CostSummaryCard({
  buyingPrice,
  feesAndCharges,
  prepCosts,
  warranty,
  otherCharges,
  listingPrice,
}: {
  buyingPrice: number;
  feesAndCharges: number;
  prepCosts: number;
  warranty: number;
  otherCharges: number;
  listingPrice: number | null;
}) {
  return (
    <CostSummaryReceipt
      buyingPrice={buyingPrice}
      feesAndCharges={feesAndCharges}
      stockingCharges={0}
      prepCosts={prepCosts}
      warranty={warranty}
      otherCharges={otherCharges}
      listingPrice={listingPrice}
    />
  );
}
