import { describe, expect, it } from "vitest";
import {
  excelDate,
  fuelType,
  leadingInt,
  lockNut,
  logBook,
  mapLegacyRow,
  mileage,
  money,
  serviceHistory,
  statuses,
  transmission,
  vehicleKind,
  yearFromPlate,
  type SheetRow,
} from "./master-sheet-import";
import { computeCostTotals } from "./vehicle-costs";

/** Excel serial for a date, as the sheet stores it. */
const serial = (iso: string) =>
  (Date.parse(iso) - Date.UTC(1899, 11, 30)) / 86_400_000;

/** Row 5 of DATA RAZA 24-08-2026.xlsx, cached values. */
const ROW_5: SheetRow = {
  A: 1, B: "LT07 JDK", C: "MERCEDES-BENZ", D: "B CLASS", E: "B150", F: "1.5 SE",
  G: "CAR", I: "BLACK", J: 93013, K: "LOCAL", L: "BCA AUCTION", M: "BCA", N: "BCA",
  O: serial("2022-03-26"), P: serial("2022-03-30"), Q: "March", R: "2022",
  S: 850, U: 221, W: 0, AC: 0, AG: 74.54, AI: 1145.54,
  AJ: serial("2022-04-05"), AK: "RECEIVED", AN: "AVAILABLE", AT: 1, AU: 1, AY: "PART",
  BB: 195, BC: "SOLD", BD: serial("2022-07-27"), BE: 1190, BI: 0, BN: 0,
  BS: "PURCHASED BY CC",
};
const HEADERS = { A: "LEGACY S/N", B: "REG. NUMBER", S: "BUYING PRICE", H: "TRANSMISSION" };

describe("cell readers", () => {
  it("treats the sheet's placeholders as blank", () => {
    expect(money("-")).toBeNull();
    expect(money(" ")).toBeNull();
    expect(money("1,200")).toBe(1200);
    expect(money(74.54)).toBe(74.54);
  });

  it("reads the leading number of a note", () => {
    expect(leadingInt("1 (1 WITH SELLER)")).toBe(1);
    expect(leadingInt("\t1582")).toBe(1582);
    expect(leadingInt("N/A")).toBeNull();
  });

  it("converts Excel serial dates", () => {
    expect(excelDate(serial("2022-03-26"))).toBe("2022-03-26");
    expect(excelDate("1//11/2024")).toBeNull();
    expect(excelDate(null)).toBeNull();
  });
});

describe("column normalisers", () => {
  it("J — keeps miles, converts km-only, prefers the miles figure", () => {
    expect(mileage(93013)).toBe(93013);
    expect(mileage("82386 (KM)")).toBe(51192);
    expect(mileage("140,670 (KM)\n88,000 (MILES)")).toBe(88000);
    expect(mileage("(79727 KM) 49,585 MILES")).toBe(49585);
    expect(mileage("INCORRECT/ NEED TO CHECK UPON ARRIVAL")).toBeNull();
  });

  it("G — vehicle type onto type + body", () => {
    expect(vehicleKind("VAN").vehicleType).toBe("van");
    expect(vehicleKind("SUV").bodyType).toBe("suv");
    expect(vehicleKind("MPV").bodyType).toBe("mpv");
    expect(vehicleKind("CAR ")).toEqual({ vehicleType: "car", bodyType: "hatchback" });
  });

  it("H — AUTO variants are automatic", () => {
    expect(transmission("AUTO/ CVT")).toBe("automatic");
    expect(transmission("MANUAL")).toBe("manual");
    expect(transmission(null)).toBe("manual");
  });

  it("AP — fuel wording", () => {
    expect(fuelType("PETROL HYBRID ELEC")).toBe("hybrid");
    expect(fuelType("ELECTRIC")).toBe("electric");
    expect(fuelType("ELEC/DIESEL")).toBe("electric");
    expect(fuelType("DIESEL")).toBe("diesel");
    expect(fuelType(null)).toBe("petrol");
  });

  it("AY — service history wording", () => {
    expect(serviceHistory("FULL SERV. HIST.")).toBe("full");
    expect(serviceHistory("PART SERVICE HISTORY.")).toBe("partial");
    expect(serviceHistory("UPTO 2021")).toBe("partial");
    expect(serviceHistory("NOT AVAILABLE")).toBe("none");
    expect(serviceHistory("NEGLIGIBLE")).toBe("none");
    expect(serviceHistory(null)).toBe("unknown");
  });

  it("AZ — lock nut notes", () => {
    expect(lockNut("YES INSIDE GLOVEBOX")).toBe(true);
    expect(lockNut("INSIDE GLOVE BOX")).toBe(true);
    expect(lockNut("NOT REQUIRED")).toBe(false);
    expect(lockNut("NO")).toBe(false);
  });

  it("AN — log book, including the sheet's own typo", () => {
    expect(logBook("AVAIALBLE").v5Received).toBe(true);
    expect(logBook("NOT AVAILABLE (CUSTOMER TO PROVIDE)").v5Received).toBe(false);
  });

  it("BC — statuses", () => {
    expect(statuses("SOLD")).toEqual({ saleStatus: "sold", status: "sold" });
    expect(statuses("RECEIVED")).toEqual({ saleStatus: "available", status: "received" });
    expect(statuses("RETURNED TO OWNER")?.saleStatus).toBe("returned_to_owner");
    expect(statuses("DUPLICATE ENTRY")).toBeNull();
  });

  it("year from a current-format plate", () => {
    expect(yearFromPlate("LT07 JDK", 2022)).toBe(2007);
    expect(yearFromPlate("PK63 XAW", 2022)).toBe(2013);
    expect(yearFromPlate("WF58KXY", 2022)).toBe(2008);
    expect(yearFromPlate("R123 ABC", 2019)).toBe(2019);
  });
});

describe("mapLegacyRow", () => {
  it("maps row 5 of the client's sheet", () => {
    const result = mapLegacyRow(ROW_5, HEADERS);
    expect(result.kind).toBe("row");
    if (result.kind !== "row") return;
    const r = result.row;
    expect(r).toMatchObject({
      legacy_serial_number: 1,
      stock_id: "L-1",
      registration: "LT07 JDK",
      make: "MERCEDES-BENZ",
      variant_name: "B150",
      variant_code: "1.5 SE",
      year: 2007,
      mileage: 93013,
      owned_by: "BCA",
      finance_provider: "bca",
      purchase_source: "auction",
      invoice_date: "2022-03-26",
      credit_note_date: "2022-03-30",
      received_date: "2022-04-05",
      buying_price: 850,
      buyers_fee: 221,
      delivery_fee: 74.54,
      log_book: "AVAILABLE",
      v5_received: true,
      service_history: "partial",
      value_addition: 195,
      sale_status: "sold",
      status: "sold",
      date_sold: "2022-07-27",
      selling_price: 1190,
      remarks: "PURCHASED BY CC",
      days_in_stock: 113,
      removed_from_website_at: "2022-07-27T00:00:00.000Z",
    });
    expect(result.sheetTotalBuyingPrice).toBe(1145.54);
  });

  it("re-derives the sheet's own AI total from the mapped costs", () => {
    const result = mapLegacyRow(ROW_5, HEADERS);
    if (result.kind !== "row") throw new Error("expected a row");
    const r = result.row;
    const { totalBuyingPrice } = computeCostTotals({
      buyingPrice: r.buying_price,
      vatOnBuyingPrice: r.vat_on_buying_price,
      buyersFee: r.buyers_fee,
      vatOnBuyersFee: r.vat_on_buyers_fee,
      inspectionCharge: r.inspection_charge,
      vatOnInspectionCharge: r.vat_on_inspection_charge,
      evAssuredCharge: r.ev_assured_charge,
      vatOnEvAssuredCharge: r.vat_on_ev_assured_charge,
      batteryReportFee: r.battery_report_fee,
      vatOnBatteryReportFee: r.vat_on_battery_report_fee,
      lateStorageFee: r.late_storage_fee,
      vatOnLateStorageFee: r.vat_on_late_storage_fee,
      collectionFee: r.collection_fee,
      vatOnCollectionFee: r.vat_on_collection_fee,
      deliveryFee: r.delivery_fee,
      vatOnDeliveryFee: r.vat_on_delivery_fee,
      otherCharges: null,
      loadingFee: null,
      unloadingFee: null,
      stockingCharges: 0,
      valueAddition: r.value_addition,
      warrantyCost: null,
    });
    expect(totalBuyingPrice).toBeCloseTo(result.sheetTotalBuyingPrice ?? NaN, 2);
  });

  it("keeps every non-blank cell verbatim in legacy_data", () => {
    const result = mapLegacyRow({ ...ROW_5, H: "AUTO/ CVT" }, HEADERS);
    if (result.kind !== "row") throw new Error("expected a row");
    expect(result.row.legacy_data).toEqual({
      "A LEGACY S/N": 1,
      "B REG. NUMBER": "LT07 JDK",
      "S BUYING PRICE": 850,
      "H TRANSMISSION": "AUTO/ CVT",
    });
  });

  it("skips duplicate entries unless asked", () => {
    const dup = { ...ROW_5, BC: "DUPLICATE ENTRY" };
    expect(mapLegacyRow(dup, HEADERS).kind).toBe("skip");
    const kept = mapLegacyRow(dup, HEADERS, { includeDuplicates: true });
    expect(kept.kind === "row" && kept.row.sale_status).toBe("duplicate_entry");
  });

  it("skips spacer rows", () => {
    expect(mapLegacyRow({ A: 5000 }, HEADERS)).toEqual({ kind: "skip", reason: "blank row" });
    expect(mapLegacyRow({ B: "AB12 CDE" }, HEADERS).kind).toBe("skip");
  });

  it("an unsold car is in stock with no sale stamp", () => {
    const r = mapLegacyRow({ ...ROW_5, BC: "RECEIVED", BD: null }, HEADERS);
    if (r.kind !== "row") throw new Error("expected a row");
    expect(r.row).toMatchObject({
      sale_status: "available",
      status: "received",
      days_in_stock: 0,
      removed_from_website_at: null,
    });
  });
});
