/**
 * What a data backup holds, and how it's read (GEN-90; nightly since
 * 2026-11-07). Shared by the Download now button (the person's own session)
 * and the nightly job (the service role, which skips row security), so every
 * table is filtered to the company explicitly: by its company_id, or through
 * the vehicle or invoice it belongs to.
 *
 * Reads go a page at a time: the database hands back at most 1,000 rows per
 * request, so a single read of a 2,000-car stock book came back half empty.
 */

import type { CellValue, Sheet } from "@/lib/xlsx";

/** The private storage bucket the nightly backups go in (0067). */
export const BACKUP_BUCKET = "backups";
/** Nightly backups kept per company; older ones are deleted. */
export const BACKUPS_KEPT = 30;

/** A backup's place in the bucket: the company's folder, one file a night. */
export const backupObjectPath = (companyId: string, day: Date = new Date()) =>
  `${companyId}/${day.toISOString().slice(0, 10)}.xlsx`;

type Scope = "company" | "vehicle" | "invoice";

const BACKUP_TABLES: { table: string; sheet: string; scope: Scope }[] = [
  { table: "vehicles", sheet: "Vehicles", scope: "company" },
  { table: "customers", sheet: "Customers", scope: "company" },
  { table: "leads", sheet: "Leads", scope: "company" },
  { table: "sales_deals", sheet: "Deals", scope: "company" },
  { table: "invoices", sheet: "Invoices", scope: "company" },
  { table: "invoice_line_items", sheet: "Invoice Lines", scope: "invoice" },
  { table: "inspection_checks", sheet: "Inspections", scope: "vehicle" },
  { table: "todo_items", sheet: "Things To Do", scope: "vehicle" },
  { table: "appointments", sheet: "Appointments", scope: "company" },
  { table: "warranties", sheet: "Warranties", scope: "company" },
  { table: "location_movements", sheet: "Location History", scope: "vehicle" },
  { table: "vendors", sheet: "Vendors", scope: "company" },
  { table: "users", sheet: "Users", scope: "company" },
];

const PAGE = 1000;
/** Ids per `in (…)` filter, so the request stays a sensible length. */
const ID_CHUNK = 150;

type Row = Record<string, unknown>;
interface Result {
  data: Row[] | null;
  error: { message?: string; code?: string } | null;
}
/** The slice of a Supabase client a backup needs: tables named at run time. */
interface Query extends PromiseLike<Result> {
  select(columns: string): Query;
  eq(column: string, value: string): Query;
  in(column: string, values: string[]): Query;
  order(column: string): Query;
  range(from: number, to: number): Query;
}
export interface BackupClient {
  from(table: string): unknown;
}

/** Every row a filter matches, a page at a time, in a stable order. */
async function readAll(client: BackupClient, table: string, filter: (q: Query) => Query, columns = "*"): Promise<Row[]> {
  const rows: Row[] = [];
  let ordered = true;
  for (let from = 0; ; from += PAGE) {
    let q = filter((client.from(table) as Query).select(columns));
    if (ordered) q = q.order("id");
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) {
      // A table without an id column: read it unordered from the start.
      if (ordered && error.code === "42703") {
        ordered = false;
        rows.length = 0;
        from = -PAGE;
        continue;
      }
      throw new Error(error.message ?? `Couldn't read ${table}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Rows whose parent is one of these ids, a chunk of ids at a time. */
async function readByParent(client: BackupClient, table: string, column: string, ids: string[]): Promise<Row[]> {
  const rows: Row[] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const chunk = ids.slice(i, i + ID_CHUNK);
    rows.push(...(await readAll(client, table, (q) => q.in(column, chunk))));
  }
  return rows;
}

/** Supabase rows are plain JSON; flatten anything nested for a cell. */
function toCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return JSON.stringify(value);
}

function rowsToSheet(name: string, rows: Row[]): Sheet {
  if (rows.length === 0) return { name, rows: [["(no rows)"]], headerRow: true };
  // Union of keys across rows, so a sparse row can never shift columns.
  const columns = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );
  return { name, headerRow: true, rows: [columns, ...rows.map((r) => columns.map((c) => toCell(r[c])))] };
}

/**
 * The company's data as workbook sheets. A table that can't be read becomes
 * a sheet saying so, rather than vanishing from the file; a backup that
 * can't read anything at all throws.
 */
export async function collectBackupSheets(client: BackupClient, companyId: string): Promise<{ sheets: Sheet[]; rows: number }> {
  const byCompany = (q: Query) => q.eq("company_id", companyId);
  const idsOf = async (table: string) =>
    (await readAll(client, table, byCompany, "id")).map((r) => String(r.id));
  const [vehicleIds, invoiceIds] = await Promise.all([idsOf("vehicles"), idsOf("invoices")]);

  const sheets: Sheet[] = [];
  let total = 0;
  let readable = 0;
  for (const spec of BACKUP_TABLES) {
    try {
      const rows =
        spec.scope === "company"
          ? await readAll(client, spec.table, byCompany)
          : spec.scope === "vehicle"
            ? await readByParent(client, spec.table, "vehicle_id", vehicleIds)
            : await readByParent(client, spec.table, "invoice_id", invoiceIds);
      total += rows.length;
      readable += 1;
      sheets.push(rowsToSheet(spec.sheet, rows));
    } catch (err) {
      sheets.push({
        name: spec.sheet,
        headerRow: true,
        rows: [[`Could not export ${spec.table}: ${err instanceof Error ? err.message : "unknown error"}`]],
      });
    }
  }
  if (readable === 0) throw new Error("Nothing could be exported.");
  return { sheets, rows: total };
}
