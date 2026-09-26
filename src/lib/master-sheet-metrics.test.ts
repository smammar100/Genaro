import { describe, expect, it } from "vitest";
import {
  columnCountsBySection,
  formatMetric,
  monthKey,
  mostCommon,
  sectionMetrics,
  type MetricVehicle,
  type SectionMetric,
} from "./master-sheet-metrics";

const NOW = new Date(2026, 8, 27); // 27 Sep 2026, local time

function car(overrides: Partial<MetricVehicle> = {}): MetricVehicle {
  return {
    saleStatus: "available",
    dateSold: null,
    sellingPrice: null,
    totalBuyingPrice: 0,
    invoiceDate: null,
    auctionHouse: null,
    receivedDate: "2026-01-10",
    logBook: null,
    numKeys: 2,
    serviceHistory: "unknown",
    valueAddition: 0,
    sellingAgent: null,
    ...overrides,
  };
}

/** label → value, for readable assertions. */
const byLabel = (metrics: SectionMetric[]) =>
  Object.fromEntries(metrics.map((m) => [m.label, m.value]));

const ROWS: MetricVehicle[] = [
  car({
    saleStatus: "sold",
    dateSold: "2026-09-24",
    sellingPrice: 11800,
    totalBuyingPrice: 9141,
    invoiceDate: "2026-08-30",
    auctionHouse: "BCA AUCTION",
    receivedDate: "2026-09-01",
    logBook: "AVAILABLE",
    serviceHistory: "full",
    valueAddition: 400,
    sellingAgent: "AUTO TRADER",
  }),
  car({
    saleStatus: "sold",
    dateSold: "2026-08-19",
    sellingPrice: 15600,
    totalBuyingPrice: 12396,
    invoiceDate: "2026-09-02",
    auctionHouse: "bca auction",
    receivedDate: "2026-09-03",
    logBook: "NOT AVAILABLE",
    numKeys: 1,
    valueAddition: 1200,
    sellingAgent: "ZUTO",
  }),
  car({
    saleStatus: "sold",
    dateSold: "2026-09-02",
    sellingPrice: 4500,
    totalBuyingPrice: 3646,
    invoiceDate: "2026-09-12",
    auctionHouse: "SOR",
    logBook: "not available ",
    serviceHistory: "full",
    sellingAgent: "AUTO TRADER",
  }),
  car({ totalBuyingPrice: 6120, invoiceDate: "2025-09-12", numKeys: 1 }),
];

describe("sectionMetrics", () => {
  it("All: cars, available, sold this month and total S − P", () => {
    expect(byLabel(sectionMetrics("all", ROWS, NOW))).toEqual({
      Cars: 4,
      Available: 1,
      "Sold this month": 2,
      // (11800-9141) + (15600-12396) + (4500-3646); unsold rows count 0.
      "Total S − P": 2659 + 3204 + 854,
    });
  });

  it("Buying: this month by invoice date, spend, average and top auction house", () => {
    const m = byLabel(sectionMetrics("buying", ROWS, NOW));
    // Same month in another year doesn't count.
    expect(m["Bought this month"]).toBe(2);
    expect(m["Total spend"]).toBe(9141 + 12396 + 3646 + 6120);
    expect(m["Average buying price"]).toBe((9141 + 12396 + 3646 + 6120) / 4);
    // Case-insensitive, spelled as first entered.
    expect(m["Most used auction house"]).toBe("BCA AUCTION");
  });

  it("Buying: the average skips cars with no buying price yet", () => {
    const m = byLabel(sectionMetrics("buying", [car({ totalBuyingPrice: 5000 }), car()], NOW));
    expect(m["Average buying price"]).toBe(5000);
  });

  it("Receiving: received this month, missing log books, single keys, full-history share", () => {
    expect(byLabel(sectionMetrics("receiving", ROWS, NOW))).toEqual({
      "Received this month": 2,
      "Log book not available": 2,
      "Single key": 2,
      "Full service history": 0.5,
    });
  });

  it("Value addition: total, average per car, cars with work, largest", () => {
    expect(byLabel(sectionMetrics("value_addition", ROWS, NOW))).toEqual({
      "Total value addition": 1600,
      "Average per car": 400,
      "Cars with value addition": 2,
      "Largest value addition": 1200,
    });
  });

  it("Sales: this month's sales, revenue and S − P, and the top lead source", () => {
    expect(byLabel(sectionMetrics("sales", ROWS, NOW))).toEqual({
      "Sold this month": 2,
      "Revenue this month": 11800 + 4500,
      "S − P this month": 2659 + 854,
      "Top lead source": "AUTO TRADER",
    });
  });

  it("aggregates over nothing are unknown, counts are zero", () => {
    expect(byLabel(sectionMetrics("all", [], NOW))).toEqual({
      Cars: 0,
      Available: 0,
      "Sold this month": 0,
      "Total S − P": null,
    });
    const sales = byLabel(sectionMetrics("sales", [car()], NOW));
    expect(sales["Revenue this month"]).toBeNull();
    expect(sales["Top lead source"]).toBeNull();
    const va = byLabel(sectionMetrics("value_addition", [car()], NOW));
    expect(va["Largest value addition"]).toBeNull();
    expect(va["Total value addition"]).toBe(0);
    expect(byLabel(sectionMetrics("receiving", [], NOW))["Full service history"]).toBeNull();
  });
});

describe("mostCommon", () => {
  it("ignores blanks and breaks ties by first seen", () => {
    expect(mostCommon([null, " ", "ZUTO", "AUTO TRADER"])).toBe("ZUTO");
    expect(mostCommon([null, undefined, ""])).toBeNull();
  });
});

describe("formatMetric", () => {
  it("formats money in whole pounds, percents, counts and unknowns", () => {
    expect(formatMetric({ value: 9344.4, format: "money" })).toBe("£9,344");
    expect(formatMetric({ value: -120, format: "money" })).toBe("-£120");
    expect(formatMetric({ value: 0.583, format: "percent" })).toBe("58%");
    expect(formatMetric({ value: 1862, format: "count" })).toBe("1,862");
    expect(formatMetric({ value: "SOR", format: "text" })).toBe("SOR");
    expect(formatMetric({ value: null, format: "money" })).toBe("—");
  });
});

describe("monthKey / columnCountsBySection", () => {
  it("keys the month in local time", () => {
    expect(monthKey(NOW)).toBe("2026-09");
  });

  it("counts each section's own columns; identity only under all", () => {
    expect(
      columnCountsBySection([
        { section: "common" },
        { section: "buying" },
        { section: "buying" },
        { section: "sales" },
        {},
      ]),
    ).toEqual({ all: 5, buying: 2, sales: 1 });
  });
});
