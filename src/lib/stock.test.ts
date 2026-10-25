import { describe, expect, it } from "vitest";
import { byNewest, byText, isInStock } from "./stock";

describe("isInStock", () => {
  it("keeps available cars, including those still in prep", () => {
    expect(isInStock({ saleStatus: "available", status: "received" })).toBe(true);
    expect(isInStock({ saleStatus: "available", status: "being_prepared" })).toBe(true);
    expect(isInStock({ saleStatus: "available", status: "listed" })).toBe(true);
  });

  it("drops sold, returned-to-owner and duplicate cars", () => {
    expect(isInStock({ saleStatus: "sold", status: "sold" })).toBe(false);
    expect(isInStock({ saleStatus: "returned_to_owner", status: "returned" })).toBe(false);
    expect(isInStock({ saleStatus: "duplicate_entry", status: "returned" })).toBe(false);
  });

  it("drops a car whose lifecycle says sold even if the sheet lags", () => {
    expect(isInStock({ saleStatus: "available", status: "sold" })).toBe(false);
  });
});

describe("byNewest", () => {
  const car = (receivedDate: string, createdAt = "2026-01-01T00:00:00Z") => ({
    receivedDate,
    createdAt,
  });

  it("puts the latest arrival first", () => {
    const sorted = [car("2026-09-01"), car("2026-10-20"), car("2026-03-15")].sort(byNewest);
    expect(sorted.map((c) => c.receivedDate)).toEqual(["2026-10-20", "2026-09-01", "2026-03-15"]);
  });

  it("breaks a same-day tie on creation time", () => {
    const early = car("2026-10-20", "2026-10-20T09:00:00Z");
    const late = car("2026-10-20", "2026-10-20T15:00:00Z");
    expect([early, late].sort(byNewest)).toEqual([late, early]);
  });
});

describe("byText", () => {
  it("ignores case and orders numbers naturally", () => {
    expect(["Mk10", "audi", "Mk2", "Audi"].sort(byText)).toEqual(["audi", "Audi", "Mk2", "Mk10"]);
  });
});
