import { describe, expect, it } from "vitest";
import { makeVehicle } from "@/test/factories";
import { carMargin } from "./car-margin";

/**
 * A car whose costs come to £10,500: £10,000 base cost (£9,300 total buying,
 * £500 value addition, £200 stocking) plus £500 spent at point of sale.
 */
const car = (overrides: Parameters<typeof makeVehicle>[0] = {}) =>
  makeVehicle({
    buyingPrice: 9000,
    vatOnBuyingPrice: 0,
    buyersFee: 300,
    collectionFee: null,
    loadingFee: 0,
    unloadingFee: 0,
    stockingCharges: 200,
    valueAddition: 500,
    warrantyCost: 0,
    partnerShare: 300,
    customerDeliveryCost: 200,
    ...overrides,
  });

describe("carMargin — 20% VAT on the margin (call 2026-10-24)", () => {
  it("takes every cost and expense off the price, then 20% of what's left", () => {
    expect(carMargin(car(), 12000)).toEqual({
      salePrice: 12000,
      totalCost: 10500,
      margin: 1500,
      vat: 300,
      profit: 1200,
    });
  });

  it("uses what the car sold for once it has sold, not the web price", () => {
    const m = carMargin(car({ sellingPrice: 11500 }), 12000);
    expect(m?.salePrice).toBe(11500);
    expect(m?.margin).toBe(1000);
    expect(m?.vat).toBe(200);
  });

  it("charges no VAT on a loss", () => {
    expect(carMargin(car(), 10000)).toEqual({
      salePrice: 10000,
      totalCost: 10500,
      margin: -500,
      vat: 0,
      profit: -500,
    });
  });

  it("has nothing to say without a price", () => {
    expect(carMargin(car(), null)).toBeNull();
    expect(carMargin(car(), 0)).toBeNull();
  });

  it("rounds to the penny", () => {
    expect(carMargin(car(), 12345.67)?.vat).toBe(369.13);
  });
});
