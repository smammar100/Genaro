import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { prepareImport, readWorkbook } from "./master-sheet-workbook";

/** Excel serial for a date, as the sheet stores it. */
const serial = (iso: string) => (Date.parse(iso) - Date.UTC(1899, 11, 30)) / 86_400_000;

type Cells = Record<string, string | number>;

/** A one-sheet .xlsx with inline strings and numbers, enough for the reader. */
function workbook(rows: Record<number, Cells>): Uint8Array {
  const xmlRows = Object.entries(rows)
    .map(([n, cells]) => {
      const cs = Object.entries(cells)
        .map(([col, v]) =>
          typeof v === "number"
            ? `<c r="${col}${n}"><v>${v}</v></c>`
            : `<c r="${col}${n}" t="inlineStr"><is><t>${v.replace(/&/g, "&amp;")}</t></is></c>`,
        )
        .join("");
      return `<row r="${n}">${cs}</row>`;
    })
    .join("");
  return zipSync({
    "xl/worksheets/sheet1.xml": strToU8(`<worksheet><sheetData>${xmlRows}</sheetData></worksheet>`),
  });
}

/** Row 5 of DATA RAZA 24-08-2026.xlsx, cached values (as master-sheet-import.test). */
const ROW: Cells = {
  A: 1, B: "LT07 JDK", C: "MERCEDES-BENZ", D: "B CLASS", E: "B150", F: "1.5 SE",
  G: "CAR", I: "BLACK", J: 93013, K: "LOCAL", L: "BCA AUCTION", M: "BCA", N: "BCA",
  O: serial("2022-03-26"), P: serial("2022-03-30"), Q: "March", R: "2022",
  S: 850, U: 221, W: 0, AC: 0, AG: 74.54, AI: 1145.54,
  AJ: serial("2022-04-05"), AK: "RECEIVED", AN: "AVAILABLE", AT: 1, AU: 1, AY: "PART",
  BB: 195, BC: "SOLD", BD: serial("2022-07-27"), BE: 1190, BI: 0, BN: 0,
  BS: "PURCHASED BY CC",
};
const HEADER: Cells = { A: "LEGACY S/N", B: "REG. NUMBER", H: "TRANSMISSION", S: "BUYING PRICE" };

describe("readWorkbook", () => {
  it("reads inline strings and numbers by row and column", () => {
    const sheet = readWorkbook(workbook({ 4: HEADER, 5: { A: 7, B: "LT07 JDK" } }));
    expect(sheet.get(4)?.A).toBe("LEGACY S/N");
    expect(sheet.get(5)).toEqual({ A: 7, B: "LT07 JDK" });
  });

  it("refuses a file that isn't a workbook", () => {
    expect(() => readWorkbook(strToU8("not a zip"))).toThrow(/isn't an Excel workbook/);
  });
});

describe("prepareImport", () => {
  it("maps each data row and works out its cost totals", () => {
    const prepared = prepareImport(readWorkbook(workbook({ 4: HEADER, 5: ROW })));
    expect(prepared.rowsRead).toBe(1);
    expect(prepared.rows).toHaveLength(1);
    expect(prepared.rows[0].legacy_serial_number).toBe(1);
    expect(prepared.rows[0].sale_status).toBe("sold");
    expect(prepared.rows[0].total_buying_price).toBeCloseTo(1145.54, 2);
    expect(prepared.mismatches).toEqual([]);
  });

  it("leaves out a repeated legacy S/N", () => {
    const prepared = prepareImport(readWorkbook(workbook({ 4: HEADER, 5: ROW, 6: ROW })));
    expect(prepared.rows).toHaveLength(1);
    expect(prepared.skipped["repeated legacy serial"]).toBe(1);
  });

  it("refuses a sheet whose row 4 isn't the master sheet header", () => {
    const sheet = readWorkbook(workbook({ 4: { A: "NAME", B: "PHONE" }, 5: ROW }));
    expect(() => prepareImport(sheet)).toThrow(/Row 4 isn't the master sheet's header/);
  });
});
