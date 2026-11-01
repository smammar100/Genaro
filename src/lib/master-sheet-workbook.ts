/**
 * Reading Car Capital's master sheet (.xlsx) into vehicle rows, shared by the
 * command-line importer (scripts/import-master-sheet.mts) and the master
 * sheet's Import button (call 2026-10-31: the cleaned sheet comes back as a
 * bulk upload). Mapping rules live in master-sheet-import; this file reads
 * the workbook, applies them, and checks each row's total against the sheet.
 *
 * Imports carry their `.ts` extension so the script can run this under plain
 * Node as well as the app's bundler.
 */

import { strFromU8, unzipSync } from "fflate";
import {
  mapLegacyRow,
  type Cell,
  type LegacyVehicleRow,
  type SheetHeaders,
  type SheetRow,
} from "./master-sheet-import.ts";
import { computeCostTotals } from "./vehicle-costs.ts";

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

/**
 * The first worksheet's cells by row number, cached values only: formulas
 * are not evaluated. Throws when the bytes aren't an .xlsx.
 */
export function readWorkbook(bytes: Uint8Array): Map<number, SheetRow> {
  let zip: Record<string, Uint8Array>;
  try {
    zip = unzipSync(bytes);
  } catch {
    throw new Error("That file isn't an Excel workbook (.xlsx).");
  }
  const shared: string[] = [];
  const sst = zip["xl/sharedStrings.xml"];
  if (sst) {
    for (const si of strFromU8(sst).matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      const parts = [...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1]));
      shared.push(parts.join(""));
    }
  }
  const sheetName = Object.keys(zip)
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))[0];
  if (!sheetName) throw new Error("That workbook has no worksheet.");
  const xml = strFromU8(zip[sheetName]);

  const rows = new Map<number, SheetRow>();
  for (const c of xml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, col, rowStr, attrs, inner = ""] = c;
    const type = /\bt="(\w+)"/.exec(attrs)?.[1];
    const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
    let value: Cell = null;
    if (type === "s" && v !== undefined) value = shared[Number(v)] ?? null;
    else if (type === "inlineStr") value = decode(/<t[^>]*>([\s\S]*?)<\/t>/.exec(inner)?.[1] ?? "");
    else if (type === "str") value = v !== undefined ? decode(v) : null;
    else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
    else if (type === "e") value = null;
    else if (v !== undefined) value = Number(v);
    const row = Number(rowStr);
    const r = rows.get(row) ?? {};
    r[col] = value;
    rows.set(row, r);
  }
  return rows;
}

type Totals = {
  total_buying_price: number;
  landed_cost: number;
  base_cost: number;
  gross_earning: number | null;
};

/** A sheet row ready to write, with its cost totals worked out. */
export type ImportRow = LegacyVehicleRow & Totals;

export interface PreparedImport {
  /** Data rows read (row 5 onwards). */
  rowsRead: number;
  rows: ImportRow[];
  /** Rows left out, by reason. */
  skipped: Record<string, number>;
  /** Rows whose total buying price disagrees with the sheet's own (column AI). */
  mismatches: string[];
}

/**
 * Map every data row of the master sheet. The header is row 4 and must start
 * LEGACY S/N, REG. NUMBER; anything else is refused rather than guessed at.
 */
export function prepareImport(
  sheet: Map<number, SheetRow>,
  opts: { includeDuplicates?: boolean; limit?: number } = {},
): PreparedImport {
  const headerRow = sheet.get(4) ?? {};
  const headers: SheetHeaders = Object.fromEntries(
    Object.entries(headerRow)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => [k, String(v).replace(/\s+/g, " ").replace(/\(\d\)/g, "").trim()]),
  );
  if (!/LEGACY/i.test(headers.A ?? "") || !/REG/i.test(headers.B ?? "")) {
    throw new Error(
      `Row 4 isn't the master sheet's header: column A should be LEGACY S/N and B REG. NUMBER (found "${headers.A ?? ""}" and "${headers.B ?? ""}").`,
    );
  }

  const rows: ImportRow[] = [];
  const skipped: Record<string, number> = {};
  const mismatches: string[] = [];
  const seenSerials = new Set<number>();
  const skip = (reason: string) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
  };

  const dataRows = [...sheet.keys()]
    .filter((n) => n >= 5)
    .sort((a, b) => a - b)
    .slice(0, opts.limit ?? Infinity);
  for (const n of dataRows) {
    const result = mapLegacyRow(sheet.get(n)!, headers, { includeDuplicates: opts.includeDuplicates });
    if (result.kind === "skip") {
      skip(result.reason);
      continue;
    }
    const r = result.row;
    if (seenSerials.has(r.legacy_serial_number)) {
      skip("repeated legacy serial");
      continue;
    }
    seenSerials.add(r.legacy_serial_number);
    const totals = computeCostTotals({
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
    if (
      result.sheetTotalBuyingPrice !== null &&
      Math.abs(totals.totalBuyingPrice - result.sheetTotalBuyingPrice) > 0.01
    ) {
      mismatches.push(
        `Row ${n} (S/N ${r.legacy_serial_number}, ${r.registration}): app ${totals.totalBuyingPrice.toFixed(2)} vs sheet ${result.sheetTotalBuyingPrice.toFixed(2)}`,
      );
    }
    rows.push({
      ...r,
      total_buying_price: totals.totalBuyingPrice,
      landed_cost: totals.landedCost,
      base_cost: totals.baseCost,
      gross_earning: r.selling_price === null ? null : Math.round(r.selling_price - totals.baseCost),
    });
  }
  return { rowsRead: dataRows.length, rows, skipped, mismatches };
}
