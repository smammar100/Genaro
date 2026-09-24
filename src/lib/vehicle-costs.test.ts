import { describe, expect, it } from "vitest";
import {
  acquisitionFees,
  affectsCostTotals,
  computeCostTotals,
  computeGrossEarning,
  costInputsOf,
  derivedCostPatch,
  handlingFees,
  withDerivedCosts,
  type VehicleCostInputs,
} from "./vehicle-costs";
import { makeVehicle } from "@/test/factories";
import type { Vehicle } from "./types";

const base: VehicleCostInputs = {
  buyingPrice: 10000,
  vatOnBuyingPrice: 0,
  buyersFee: 200,
  vatOnBuyersFee: 40,
  inspectionCharge: 50,
  vatOnInspectionCharge: 10,
  evAssuredCharge: null,
  vatOnEvAssuredCharge: null,
  batteryReportFee: null,
  vatOnBatteryReportFee: null,
  lateStorageFee: 25,
  vatOnLateStorageFee: null,
  collectionFee: 100,
  vatOnCollectionFee: null,
  deliveryFee: 75,
  vatOnDeliveryFee: 15,
  otherCharges: 60,
  loadingFee: 30,
  unloadingFee: 20,
  stockingCharges: 85,
  valueAddition: 400,
  warrantyCost: 150,
};

const allNull: VehicleCostInputs = {
  buyingPrice: 0,
  vatOnBuyingPrice: null,
  buyersFee: null,
  vatOnBuyersFee: null,
  inspectionCharge: null,
  vatOnInspectionCharge: null,
  evAssuredCharge: null,
  vatOnEvAssuredCharge: null,
  batteryReportFee: null,
  vatOnBatteryReportFee: null,
  lateStorageFee: null,
  vatOnLateStorageFee: null,
  collectionFee: null,
  vatOnCollectionFee: null,
  deliveryFee: null,
  vatOnDeliveryFee: null,
  otherCharges: null,
  loadingFee: null,
  unloadingFee: null,
  stockingCharges: 0,
  valueAddition: 0,
  warrantyCost: null,
};

describe("acquisitionFees", () => {
  it("sums the sheet's fees and the VAT on each (U–AH)", () => {
    // 200+40 + 50+10 + 25 + 100 + 75+15
    expect(acquisitionFees(base)).toBe(515);
  });

  it("leaves other charges out — they are not a sheet column", () => {
    expect(acquisitionFees({ ...base, otherCharges: 9999 })).toBe(515);
  });

  it("treats nulls as zero rather than NaN", () => {
    expect(acquisitionFees(allNull)).toBe(0);
  });
});

describe("handlingFees", () => {
  it("sums loading and unloading", () => {
    expect(handlingFees(base)).toBe(50);
  });

  it("treats nulls as zero", () => {
    expect(handlingFees({ ...base, loadingFee: null, unloadingFee: null })).toBe(0);
  });
});

describe("computeCostTotals", () => {
  it("derives total buying as the sheet's SUM(S:AH)", () => {
    // 10000 buying + 0 VAT + 515 fees-with-VAT
    expect(computeCostTotals(base).totalBuyingPrice).toBe(10515);
  });

  it("includes VAT paid on the buying price (T)", () => {
    expect(
      computeCostTotals({ ...base, vatOnBuyingPrice: 2000 }).totalBuyingPrice,
    ).toBe(12515);
  });

  // Row 5 of the client's sheet (LT07 JDK): S=850, U=221, W=0, AC=0, AG=74.54
  // → AI = 1145.54 (the value Excel cached for that row).
  it("matches a real row of the master sheet", () => {
    const row = computeCostTotals({
      ...allNull,
      buyingPrice: 850,
      buyersFee: 221,
      inspectionCharge: 0,
      lateStorageFee: 0,
      deliveryFee: 74.54,
    });
    expect(row.totalBuyingPrice).toBeCloseTo(1145.54, 2);
  });

  it("derives landed cost from total buying plus other, handling and prep", () => {
    // 10515 + 60 other + 50 handling + 400 prep
    expect(computeCostTotals(base).landedCost).toBe(11025);
  });

  it("derives base cost including stocking and warranty", () => {
    // 11025 + 85 stocking + 150 warranty
    expect(computeCostTotals(base).baseCost).toBe(11260);
  });

  /**
   * The guarantee the Financials tab depends on: the stored baseCost and the
   * on-screen expense ledger total must be the same number.
   */
  it("equals the sum of every expense ledger line", () => {
    const ledgerTotal = Object.values(base).reduce<number>(
      (sum, v) => sum + (typeof v === "number" ? v : 0),
      0,
    );
    expect(computeCostTotals(base).baseCost).toBe(ledgerTotal);
  });

  it("handles an all-null cost sheet", () => {
    expect(computeCostTotals(allNull)).toEqual({
      totalBuyingPrice: 0,
      landedCost: 0,
      baseCost: 0,
    });
  });

  // GEN-88 UAT 3/4: correcting the buying price must move the totals.
  it("propagates a buying-price correction into every total", () => {
    const corrected = computeCostTotals({ ...base, buyingPrice: 9000 });
    expect(corrected.totalBuyingPrice).toBe(9515);
    expect(corrected.landedCost).toBe(10025);
    expect(corrected.baseCost).toBe(10260);
  });
});

describe("computeGrossEarning", () => {
  it("uses the realised price for a sold car", () => {
    expect(computeGrossEarning(13000, 14000, 11195)).toBe(1805);
  });

  it("falls back to the asking price when unsold", () => {
    expect(computeGrossEarning(null, 14000, 11195)).toBe(2805);
  });

  it("is null when neither price is known", () => {
    expect(computeGrossEarning(null, null, 11195)).toBeNull();
  });

  it("can be negative on a loss-making car", () => {
    expect(computeGrossEarning(10000, null, 11195)).toBe(-1195);
  });
});

describe("derivedCostPatch", () => {
  it("returns every derived column for the edited record", () => {
    const patch = derivedCostPatch({
      ...base,
      sellingPrice: null,
      listingPrice: 14000,
    });
    expect(patch).toEqual({
      totalBuyingPrice: 10515,
      landedCost: 11025,
      baseCost: 11260,
      grossEarning: 2740,
    });
  });
});

/** `base` as a vehicle row (its T column is a number, not nullable). */
const baseVehicle = (overrides: Partial<Vehicle>) =>
  makeVehicle({ ...base, vatOnBuyingPrice: 0, ...overrides });

describe("withDerivedCosts", () => {
  const vehicle = baseVehicle({ sellingPrice: null, listingPrice: 14000 });

  it("adds the re-derived totals to a cost edit", () => {
    const patch = withDerivedCosts(vehicle, { vatOnDeliveryFee: 115 });
    expect(patch).toMatchObject({
      vatOnDeliveryFee: 115,
      totalBuyingPrice: 10615,
      baseCost: 11360,
      grossEarning: 2640,
    });
  });

  it("leaves an unrelated edit untouched", () => {
    expect(withDerivedCosts(vehicle, { colour: "RED" })).toEqual({
      colour: "RED",
    });
  });
});

describe("costInputsOf", () => {
  it("reads every cost input off the vehicle, with the patch applied", () => {
    const vehicle = baseVehicle({ sellingPrice: 13000, listingPrice: null });
    const inputs = costInputsOf(vehicle, { buyingPrice: 1 });
    expect(inputs.buyingPrice).toBe(1);
    expect(inputs.vatOnBuyersFee).toBe(40);
    expect(inputs.sellingPrice).toBe(13000);
  });
});

describe("affectsCostTotals", () => {
  it("detects a cost-field edit", () => {
    expect(affectsCostTotals({ buyingPrice: 9000 })).toBe(true);
    expect(affectsCostTotals({ warrantyCost: 0 })).toBe(true);
    expect(affectsCostTotals({ vatOnCollectionFee: 4 })).toBe(true);
    expect(affectsCostTotals({ batteryReportFee: 30 })).toBe(true);
  });

  it("detects a price edit, which moves profit", () => {
    expect(affectsCostTotals({ listingPrice: 12000 })).toBe(true);
    expect(affectsCostTotals({ sellingPrice: 12000 })).toBe(true);
  });

  it("ignores an unrelated edit", () => {
    expect(affectsCostTotals({ colour: "Red" })).toBe(false);
    expect(affectsCostTotals({})).toBe(false);
  });
});
