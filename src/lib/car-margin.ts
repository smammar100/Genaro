import type { Vehicle } from "./types";
import { computeCostTotals, type VehicleCostInputs } from "./vehicle-costs";
import { expenseAtPointOfSale } from "./master-sheet";

/** VAT on a car's margin (call 2026-10-24). */
export const MARGIN_VAT_RATE = 0.2;

export interface CarMargin {
  /** What the car sold for, or its web price until it sells. */
  salePrice: number;
  /** Everything the car cost: base cost plus the expenses at point of sale. */
  totalCost: number;
  /** Sale price − total cost. Negative on a loss. */
  margin: number;
  /** 20% of the margin; nothing on a loss. */
  vat: number;
  /** Margin − VAT. */
  profit: number;
}

type MarginInputs = VehicleCostInputs &
  Parameters<typeof expenseAtPointOfSale>[0] &
  Pick<Vehicle, "sellingPrice">;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * A car's margin and the VAT on it, as Car Capital reckons it: the purchase
 * cost plus every expense on the car is its total cost, the margin is what it
 * sold for less that, and VAT is 20% of the margin.
 *
 * This is the dealer's profit view (vehicle Overview and Financials). Sale
 * invoices keep HMRC's margin-scheme figure in `vat.ts`, which is what the
 * VAT return uses.
 *
 * Returns null when there's no price to work from.
 */
export function carMargin(v: MarginInputs, webPrice: number | null): CarMargin | null {
  const salePrice = v.sellingPrice ?? webPrice;
  if (!salePrice) return null;
  const totalCost = round2(computeCostTotals(v).baseCost + expenseAtPointOfSale(v));
  const margin = round2(salePrice - totalCost);
  const vat = round2(Math.max(0, margin) * MARGIN_VAT_RATE);
  return { salePrice, totalCost, margin, vat, profit: round2(margin - vat) };
}
