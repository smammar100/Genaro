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
import { createClient } from "@supabase/supabase-js";
import type { LegacyVehicleRow } from "../src/lib/master-sheet-import.ts";
import { prepareImport, readWorkbook } from "../src/lib/master-sheet-workbook.ts";

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
 * Read + map (src/lib/master-sheet-workbook.ts, shared with the app)
 * ------------------------------------------------------------------ */

let prepared: ReturnType<typeof prepareImport>;
try {
  prepared = prepareImport(readWorkbook(new Uint8Array(readFileSync(FILE))), {
    includeDuplicates: INCLUDE_DUPLICATES,
    limit: LIMIT,
  });
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
const { rowsRead, rows: mapped, mismatches } = prepared;
const skipped = new Map(Object.entries(prepared.skipped));

const count = (pred: (r: LegacyVehicleRow) => boolean) => mapped.filter(pred).length;
console.log(`\nMaster sheet: ${FILE}`);
console.log(`  data rows read      ${rowsRead}`);
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
