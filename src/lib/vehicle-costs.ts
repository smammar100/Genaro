/**
 * The canonical vehicle cost rollup (GEN-88, master sheet restructure).
 *
 * `totalBuyingPrice`, `landedCost` and `baseCost` are *stored* columns, not
 * computed ones — All Vehicles' "Total cost" and "Profit", the Master Sheet
 * and the reports all read them straight from the row. So editing a cost field
 * without recomputing these leaves the rest of the app quoting a stale figure
 * that no longer matches the ledger the user is looking at.
 *
 * `totalBuyingPrice` is the master sheet's column AI, `SUM(S:AH)`: the buying
 * price and six acquisition fees, each followed by the VAT actually paid on it
 * (docs/master-sheet-spec.md). It must equal that sum exactly, so the app-only
 * costs (other charges, stocking-finance handling, prep, warranty) sit below it.
 *
 * `baseCost` is the sum of every line the Financials expense ledger displays,
 * so the stored figure and the on-screen "Total expenses" are the same number
 * by construction rather than by coincidence.
 */

import type { Vehicle } from "./types";

export interface VehicleCostInputs {
  // Master sheet S–AH, in sheet order.
  buyingPrice: number;
  vatOnBuyingPrice: number | null;
  buyersFee: number | null;
  vatOnBuyersFee: number | null;
  inspectionCharge: number | null;
  vatOnInspectionCharge: number | null;
  evAssuredCharge: number | null;
  vatOnEvAssuredCharge: number | null;
  batteryReportFee: number | null;
  vatOnBatteryReportFee: number | null;
  lateStorageFee: number | null;
  vatOnLateStorageFee: number | null;
  collectionFee: number | null;
  vatOnCollectionFee: number | null;
  deliveryFee: number | null;
  vatOnDeliveryFee: number | null;
  // App-only costs below the sheet's total buying price.
  otherCharges: number | null;
  loadingFee: number | null;
  unloadingFee: number | null;
  stockingCharges: number;
  valueAddition: number;
  warrantyCost: number | null;
}

interface VehicleCostTotals {
  /** Master sheet AI — buying price plus acquisition fees, all with VAT. */
  totalBuyingPrice: number;
  /** Total buying plus getting-it-here and getting-it-ready costs. */
  landedCost: number;
  /** Everything the car has cost — equals the expense ledger total. */
  baseCost: number;
}

const n = (v: number | null | undefined): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

/**
 * Master sheet U–AH: the six acquisition fees and the VAT paid on each. The
 * buying price (S) and its VAT (T) are the other two terms of AI.
 */
export function acquisitionFees(v: VehicleCostInputs): number {
  return (
    n(v.buyersFee) +
    n(v.vatOnBuyersFee) +
    n(v.inspectionCharge) +
    n(v.vatOnInspectionCharge) +
    n(v.evAssuredCharge) +
    n(v.vatOnEvAssuredCharge) +
    n(v.batteryReportFee) +
    n(v.vatOnBatteryReportFee) +
    n(v.lateStorageFee) +
    n(v.vatOnLateStorageFee) +
    n(v.collectionFee) +
    n(v.vatOnCollectionFee) +
    n(v.deliveryFee) +
    n(v.vatOnDeliveryFee)
  );
}

/** Movement costs — physically handling the car. */
export function handlingFees(v: VehicleCostInputs): number {
  return n(v.loadingFee) + n(v.unloadingFee);
}

export function computeCostTotals(v: VehicleCostInputs): VehicleCostTotals {
  const totalBuyingPrice =
    n(v.buyingPrice) + n(v.vatOnBuyingPrice) + acquisitionFees(v);
  const landedCost =
    totalBuyingPrice + n(v.otherCharges) + handlingFees(v) + n(v.valueAddition);
  const baseCost = landedCost + n(v.stockingCharges) + n(v.warrantyCost);
  return { totalBuyingPrice, landedCost, baseCost };
}

/**
 * Profit against a base cost. Mirrors the "Profit" column in All Vehicles:
 * a sold car uses its realised price, an unsold one its asking price.
 */
export function computeGrossEarning(
  sellingPrice: number | null,
  listingPrice: number | null,
  baseCost: number,
): number | null {
  const topLine = sellingPrice ?? listingPrice;
  return topLine === null ? null : Math.round(topLine - baseCost);
}

/** The keys that feed the rollup — an edit to any of them re-derives. */
const COST_INPUT_KEYS = [
  "buyingPrice",
  "vatOnBuyingPrice",
  "buyersFee",
  "vatOnBuyersFee",
  "inspectionCharge",
  "vatOnInspectionCharge",
  "evAssuredCharge",
  "vatOnEvAssuredCharge",
  "batteryReportFee",
  "vatOnBatteryReportFee",
  "lateStorageFee",
  "vatOnLateStorageFee",
  "collectionFee",
  "vatOnCollectionFee",
  "deliveryFee",
  "vatOnDeliveryFee",
  "otherCharges",
  "loadingFee",
  "unloadingFee",
  "stockingCharges",
  "valueAddition",
  "warrantyCost",
] as const satisfies readonly (keyof VehicleCostInputs)[];

/**
 * The cost inputs of a vehicle (optionally with a pending patch applied), so
 * callers never hand-copy the field list — the list above is the only one.
 */
export function costInputsOf(
  v: Vehicle,
  patch: Partial<Vehicle> = {},
): VehicleCostInputs & {
  sellingPrice: number | null;
  listingPrice: number | null;
} {
  const next = { ...v, ...patch };
  const inputs = Object.fromEntries(
    COST_INPUT_KEYS.map((k) => [k, next[k]]),
  ) as unknown as VehicleCostInputs;
  return {
    ...inputs,
    sellingPrice: next.sellingPrice,
    listingPrice: next.listingPrice,
  };
}

/**
 * Everything that must be written alongside an edited cost field so the stored
 * derived columns stay true. Returns only the derived keys — merge this into
 * the user's patch.
 */
export function derivedCostPatch(
  next: VehicleCostInputs & {
    sellingPrice: number | null;
    listingPrice: number | null;
  },
): VehicleCostTotals & { grossEarning: number | null } {
  const totals = computeCostTotals(next);
  return {
    ...totals,
    grossEarning: computeGrossEarning(
      next.sellingPrice,
      next.listingPrice,
      totals.baseCost,
    ),
  };
}

/** `patch` plus the re-derived totals, when the patch touches any cost input. */
export function withDerivedCosts(
  v: Vehicle,
  patch: Partial<Vehicle>,
): Partial<Vehicle> {
  if (!affectsCostTotals(patch)) return patch;
  return { ...patch, ...derivedCostPatch(costInputsOf(v, patch)) };
}

/** True when a patch touches anything the derived totals depend on. */
export function affectsCostTotals(patch: Record<string, unknown>): boolean {
  return (
    COST_INPUT_KEYS.some((k) => k in patch) ||
    "sellingPrice" in patch ||
    "listingPrice" in patch
  );
}
