import { describe, expect, it } from "vitest";
import { makeVehicle } from "@/test/factories";
import {
  expenseAtPointOfSale,
  isValueAdditionLocked,
  logBookPatch,
  monthName,
  purchaseMonth,
  purchaseYear,
  receivingConfirmation,
  receivingMonth,
  receivingYear,
  sheetProfit,
  soldMonth,
  soldYear,
  valueAdditionFromTodos,
  vehicleCategory,
  vehicleCategoryPatch,
  yearOf,
} from "./master-sheet";

describe("month / year columns (Q, R, AL, AM, BQ, BR)", () => {
  it("formats like Excel's TEXT(date,\"mmmm\") and TEXT(date,\"yyyy\")", () => {
    expect(monthName("2022-03-26")).toBe("March");
    expect(yearOf("2022-03-26")).toBe("2022");
  });

  it("is blank for a blank date, as the sheet's ISNUMBER guard", () => {
    expect(monthName(null)).toBeNull();
    expect(yearOf("")).toBeNull();
    expect(monthName("not a date")).toBeNull();
  });

  it("reads a timestamp too", () => {
    expect(monthName("2026-12-01T09:00:00.000Z")).toBe("December");
  });

  // Sheet row 5 (LT07 JDK): O=2022-03-26 → Q "March", R "2022";
  // AJ=2022-04-05 → AK "RECEIVED", AL "April", AM "2022".
  it("matches row 5 of the client's sheet", () => {
    const v = makeVehicle({ invoiceDate: "2022-03-26", receivedDate: "2022-04-05" });
    expect(purchaseMonth(v)).toBe("March");
    expect(purchaseYear(v)).toBe("2022");
    expect(receivingConfirmation(v)).toBe("RECEIVED");
    expect(receivingMonth(v)).toBe("April");
    expect(receivingYear(v)).toBe("2022");
  });

  it("only confirms receipt when there is a receiving date", () => {
    expect(receivingConfirmation(makeVehicle({ receivedDate: "" }))).toBeNull();
  });
});

describe("sales formulas (BO, BP, BQ, BR)", () => {
  it("BO sums BH to BN", () => {
    const v = makeVehicle({
      financeCompanyCharges: 100,
      partnerShare: 200,
      extendedWarrantyCost: 300,
      roadTaxCost: 20,
      insuranceCost: null,
      otherJobsCost: 5,
      customerDeliveryCost: 50,
    });
    expect(expenseAtPointOfSale(v)).toBe(675);
  });

  // Sheet row 5: BE=1190, AI=1145.54, BC=SOLD → BP 44.46
  it("BP is selling price minus total buying price for a sold row", () => {
    const v = makeVehicle({
      saleStatus: "sold",
      sellingPrice: 1190,
      totalBuyingPrice: 1145.54,
    });
    expect(sheetProfit(v)).toBeCloseTo(44.46, 2);
  });

  it("BP is 0 unless the row is SOLD", () => {
    const v = makeVehicle({
      saleStatus: "available",
      sellingPrice: 1190,
      totalBuyingPrice: 1000,
    });
    expect(sheetProfit(v)).toBe(0);
  });

  it("BP ignores value addition and point-of-sale expenses, as the sheet does", () => {
    const v = makeVehicle({
      saleStatus: "sold",
      sellingPrice: 5000,
      totalBuyingPrice: 4000,
      valueAddition: 700,
      partnerShare: 250,
    });
    expect(sheetProfit(v)).toBe(1000);
  });

  it("BQ/BR show the sale month only on SOLD rows", () => {
    const sold = makeVehicle({ saleStatus: "sold", dateSold: "2022-07-27" });
    expect(soldMonth(sold)).toBe("July");
    expect(soldYear(sold)).toBe("2022");
    const back = makeVehicle({ saleStatus: "returned_to_owner", dateSold: "2022-07-27" });
    expect(soldMonth(back)).toBeNull();
    expect(soldYear(back)).toBeNull();
  });
});

describe("value addition (BB)", () => {
  it("sums every to-do cost except cancelled items", () => {
    expect(
      valueAdditionFromTodos([
        { cost: 120, status: "completed" },
        { cost: 45.5, status: "pending" },
        { cost: null, status: "in_progress" },
        { cost: 999, status: "cancelled" },
      ]),
    ).toBe(165.5);
  });

  it("is 0 with no to-dos", () => {
    expect(valueAdditionFromTodos([])).toBe(0);
  });

  it("locks the imported figure on a legacy car", () => {
    expect(isValueAdditionLocked({ legacySerialNumber: 42 })).toBe(true);
    expect(isValueAdditionLocked({ legacySerialNumber: null })).toBe(false);
  });
});

describe("vehicle type (G)", () => {
  it("derives CAR / SUV / MPV / VAN", () => {
    expect(vehicleCategory({ vehicleType: "van", bodyType: "hatchback" })).toBe("VAN");
    expect(vehicleCategory({ vehicleType: "car", bodyType: "suv" })).toBe("SUV");
    expect(vehicleCategory({ vehicleType: "car", bodyType: "mpv" })).toBe("MPV");
    expect(vehicleCategory({ vehicleType: "car", bodyType: "saloon" })).toBe("CAR");
  });

  it("round-trips every choice", () => {
    for (const cat of ["CAR", "SUV", "MPV", "VAN"] as const) {
      const patch = vehicleCategoryPatch(cat, { bodyType: "estate" });
      expect(vehicleCategory(patch)).toBe(cat);
    }
  });

  it("keeps a specific body when switching back to CAR", () => {
    expect(vehicleCategoryPatch("CAR", { bodyType: "estate" }).bodyType).toBe("estate");
    expect(vehicleCategoryPatch("CAR", { bodyType: "suv" }).bodyType).toBe("hatchback");
  });
});

describe("log book (AN)", () => {
  it("marks the V5 received when the log book is available", () => {
    expect(logBookPatch("available")).toEqual({ logBook: "AVAILABLE", v5Received: true });
    expect(logBookPatch("YES ONLINE")).toEqual({ logBook: "YES ONLINE", v5Received: true });
  });

  it("clears the V5 flag otherwise", () => {
    expect(logBookPatch("NOT AVAILABLE").v5Received).toBe(false);
    expect(logBookPatch("  ")).toEqual({ logBook: null, v5Received: false });
  });
});
