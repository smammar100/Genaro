/**
 * Import Car Capital's legacy Excel master sheet into `vehicles`.
 *
 *   node scripts/import-master-sheet.mts --file "DATA RAZA 24-08-2026.xlsx"
 *   node scripts/import-master-sheet.mts --file <xlsx> --apply --company <uuid> --received-by <user uuid>
 *
 * DRY RUN BY DEFAULT: reads and maps every row, cross-checks each row's
 * TOTAL BUYING PRICE against the value Excel cached for column AI, and prints
 * a report. Nothing is written without --apply.
 *
 * With --apply it needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in
 * .env.local and migration 0050 applied. Re-runnable: rows are matched on
 * (company, legacy serial number) — existing ones are updated, new ones
 * inserted. Legacy rows get stock IDs `L-<serial>`, so the company's CC-
 * sequence is untouched.
 *
 * Flags:
 *   --file <path>            the .xlsx (first worksheet is read)
 *   --apply                  write to the database
 *   --company <uuid>         company to import into (required with --apply)
 *   --received-by <uuid>     user recorded as receiver (required with --apply)
 *   --include-duplicates     also import rows marked DUPLICATE ENTRY
 *   --limit <n>              only the first n data rows (for a trial run)
 *
 * Mapping rules: docs/master-sheet-spec.md; code: src/lib/master-sheet-import.ts.
 */

import { readFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { createClient } from "@supabase/supabase-js";
import {
  mapLegacyRow,
  type Cell,
  type LegacyVehicleRow,
  type SheetHeaders,
  type SheetRow,
} from "../src/lib/master-sheet-import.ts";
import { computeCostTotals } from "../src/lib/vehicle-costs.ts";

/* ------------------------------------------------------------------ *
 * Args
 * ------------------------------------------------------------------ */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const FILE = arg("file");
const APPLY = flag("apply");
const COMPANY = arg("company");
const RECEIVED_BY = arg("received-by");
const INCLUDE_DUPLICATES = flag("include-duplicates");
const LIMIT = arg("limit") ? Number(arg("limit")) : Infinity;

if (!FILE) {
  console.error("Usage: node scripts/import-master-sheet.mts --file <xlsx> [--apply --company <uuid> --received-by <uuid>]");
  process.exit(1);
}
if (APPLY && (!COMPANY || !RECEIVED_BY)) {
  console.error("--apply needs --company <uuid> and --received-by <user uuid>.");
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Minimal .xlsx reader (cached values only — formulas are not evaluated)
 * ------------------------------------------------------------------ */

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

function readWorkbook(path: string): Map<number, SheetRow> {
  const zip = unzipSync(new Uint8Array(readFileSync(path)));
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

/* ------------------------------------------------------------------ *
 * Map + verify
 * ------------------------------------------------------------------ */

const sheet = readWorkbook(FILE);
const headerRow = sheet.get(4) ?? {};
const headers: SheetHeaders = Object.fromEntries(
  Object.entries(headerRow)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => [k, String(v).replace(/\s+/g, " ").replace(/\(\d\)/g, "").trim()]),
);
if (!/LEGACY/i.test(headers.A ?? "") || !/REG/i.test(headers.B ?? "")) {
  console.error(`Row 4 doesn't look like the master sheet header (A="${headers.A}", B="${headers.B}").`);
  process.exit(1);
}

type Totals = { total_buying_price: number; landed_cost: number; base_cost: number; gross_earning: number | null };
const mapped: (LegacyVehicleRow & Totals)[] = [];
const skipped = new Map<string, number>();
const mismatches: string[] = [];
const seenSerials = new Set<number>();

const dataRows = [...sheet.keys()].filter((n) => n >= 5).sort((a, b) => a - b);
for (const n of dataRows.slice(0, LIMIT)) {
  const result = mapLegacyRow(sheet.get(n)!, headers, { includeDuplicates: INCLUDE_DUPLICATES });
  if (result.kind === "skip") {
    skipped.set(result.reason, (skipped.get(result.reason) ?? 0) + 1);
    continue;
  }
  const r = result.row;
  if (seenSerials.has(r.legacy_serial_number)) {
    skipped.set("repeated legacy serial", (skipped.get("repeated legacy serial") ?? 0) + 1);
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
      `row ${n} (S/N ${r.legacy_serial_number}, ${r.registration}): app ${totals.totalBuyingPrice.toFixed(2)} vs sheet ${result.sheetTotalBuyingPrice.toFixed(2)}`,
    );
  }
  mapped.push({
    ...r,
    total_buying_price: totals.totalBuyingPrice,
    landed_cost: totals.landedCost,
    base_cost: totals.baseCost,
    gross_earning:
      r.selling_price === null ? null : Math.round(r.selling_price - totals.baseCost),
  });
}

const count = (pred: (r: LegacyVehicleRow) => boolean) => mapped.filter(pred).length;
console.log(`\nMaster sheet: ${FILE}`);
console.log(`  data rows read      ${Math.min(dataRows.length, LIMIT)}`);
console.log(`  mapped              ${mapped.length}`);
console.log(`    sold              ${count((r) => r.sale_status === "sold")}`);
console.log(`    in stock          ${count((r) => r.sale_status === "available")}`);
console.log(`    returned to owner ${count((r) => r.sale_status === "returned_to_owner")}`);
console.log(`    duplicate entry   ${count((r) => r.sale_status === "duplicate_entry")}`);
for (const [reason, n] of skipped) console.log(`  skipped (${reason})`.padEnd(22) + ` ${n}`);
const unregistered = mapped.filter((r) => r.registration === "UNREGISTERED");
console.log(`  unregistered        ${unregistered.length}`);
for (const r of unregistered.slice(0, 5)) {
  console.log(`    S/N ${r.legacy_serial_number}: ${r.make} ${r.model}, sheet reg ${JSON.stringify(r.legacy_data["B REG. NUMBER"] ?? null)}`);
}
console.log(`  AI check            ${mapped.length - mismatches.length} match the sheet, ${mismatches.length} differ`);
for (const m of mismatches.slice(0, 20)) console.log(`    ${m}`);
if (mismatches.length > 20) console.log(`    … ${mismatches.length - 20} more`);

if (!APPLY) {
  console.log("\nDry run — nothing written. Re-run with --apply --company <uuid> --received-by <uuid>.\n");
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 * Write
 * ------------------------------------------------------------------ */

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.trimStart().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const existing = new Map<number, string>();
for (let from = 0; ; from += 1000) {
  const { data, error } = await admin
    .from("vehicles")
    .select("id, legacy_serial_number")
    .eq("company_id", COMPANY!)
    .not("legacy_serial_number", "is", null)
    .range(from, from + 999);
  if (error) throw error;
  for (const row of data ?? []) existing.set(row.legacy_serial_number as number, row.id as string);
  if ((data ?? []).length < 1000) break;
}

const withCompany = mapped.map((r) => ({
  ...r,
  company_id: COMPANY!,
  received_by: RECEIVED_BY!,
  is_demo: false,
}));
const inserts = withCompany.filter((r) => !existing.has(r.legacy_serial_number));
const updates = withCompany.filter((r) => existing.has(r.legacy_serial_number));

let inserted = 0;
for (let i = 0; i < inserts.length; i += 200) {
  const batch = inserts.slice(i, i + 200);
  const { error } = await admin.from("vehicles").insert(batch);
  if (error) throw new Error(`insert batch at ${i}: ${error.message}`);
  inserted += batch.length;
  process.stdout.write(`\r  inserted ${inserted}/${inserts.length}`);
}
let updated = 0;
for (const r of updates) {
  // stock_id stays whatever the row already has.
  const { stock_id: _stockId, ...patch } = r;
  void _stockId;
  const { error } = await admin
    .from("vehicles")
    .update(patch)
    .eq("id", existing.get(r.legacy_serial_number)!);
  if (error) throw new Error(`update S/N ${r.legacy_serial_number}: ${error.message}`);
  updated += 1;
}
console.log(`\n  inserted ${inserted}, updated ${updated}. Done.\n`);
