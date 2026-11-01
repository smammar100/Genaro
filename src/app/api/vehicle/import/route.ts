/**
 * Bulk upload of the master sheet (call 2026-10-31): the client sends the
 * cleaned Excel sheet back and it lands on the master sheet, new cars added
 * and known ones (matched on legacy S/N) brought up to date.
 *
 *   POST multipart/form-data  file=<.xlsx>  mode=preview|apply
 *
 * `preview` reads and maps the sheet and reports what would happen; nothing is
 * written. `apply` writes it. Both need Add Vehicle and Edit Costs, since the
 * sheet carries every cost column; the company is always the caller's own.
 * Writes use the service role, as the command-line importer does, because a
 * sheet of 2,000 rows is past what row-by-row RLS writes from a browser do well.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  authErrorResponse,
  requireCapability,
  requireUser,
} from "@/lib/auth/require-user";
import { prepareImport, readWorkbook } from "@/lib/master-sheet-workbook";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Bigger than any sheet the client keeps (their full sheet is ~1 MB). */
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  let actor;
  try {
    actor = await requireUser();
    requireCapability(actor, "inventory:add");
    requireCapability(actor, "inventory:edit_costs");
  } catch (e) {
    const r = authErrorResponse(e);
    if (r) return r;
    throw e;
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the sheet as a file upload." }, { status: 400 });
  }
  const file = form.get("file");
  const mode = form.get("mode") === "apply" ? "apply" : "preview";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose the master sheet to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is larger than 15 MB." }, { status: 413 });
  }

  let prepared;
  try {
    prepared = prepareImport(readWorkbook(new Uint8Array(await file.arrayBuffer())));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  const admin = createAdminClient();
  const existing = new Map<number, string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("vehicles")
      .select("id, legacy_serial_number")
      .eq("company_id", actor.companyId)
      .not("legacy_serial_number", "is", null)
      .range(from, from + 999);
    if (error) {
      logger.error("vehicle-import", "existing lookup failed", { error });
      return NextResponse.json({ error: "Couldn't read the current master sheet." }, { status: 502 });
    }
    for (const row of data ?? []) existing.set(row.legacy_serial_number as number, row.id as string);
    if ((data ?? []).length < 1000) break;
  }

  const rows = prepared.rows.map((r) => ({
    ...r,
    company_id: actor.companyId,
    received_by: actor.id,
    is_demo: false,
  }));
  const inserts = rows.filter((r) => !existing.has(r.legacy_serial_number));
  const updates = rows.filter((r) => existing.has(r.legacy_serial_number));
  const byStatus = (status: string) => rows.filter((r) => r.sale_status === status).length;

  const summary = {
    rowsRead: prepared.rowsRead,
    mapped: rows.length,
    newCars: inserts.length,
    updatedCars: updates.length,
    inStock: byStatus("available"),
    sold: byStatus("sold"),
    returnedToOwner: byStatus("returned_to_owner"),
    unregistered: rows.filter((r) => r.registration === "UNREGISTERED").length,
    skipped: prepared.skipped,
    mismatches: prepared.mismatches.slice(0, 20),
    mismatchCount: prepared.mismatches.length,
  };
  if (mode === "preview") return NextResponse.json(summary);

  let inserted = 0;
  for (let i = 0; i < inserts.length; i += 200) {
    const batch = inserts.slice(i, i + 200);
    const { error } = await admin.from("vehicles").insert(batch as never);
    if (error) {
      logger.error("vehicle-import", "insert failed", { at: i, error });
      return NextResponse.json(
        { error: `Stopped after ${inserted} new cars: ${error.message}`, inserted },
        { status: 502 },
      );
    }
    inserted += batch.length;
  }
  let updated = 0;
  for (const r of updates) {
    // A car keeps the stock ID it already has.
    const { stock_id: _stockId, ...patch } = r;
    void _stockId;
    const { error } = await admin
      .from("vehicles")
      .update(patch as never)
      .eq("id", existing.get(r.legacy_serial_number)!);
    if (error) {
      logger.error("vehicle-import", "update failed", { serial: r.legacy_serial_number, error });
      return NextResponse.json(
        { error: `Stopped at S/N ${r.legacy_serial_number}: ${error.message}`, inserted, updated },
        { status: 502 },
      );
    }
    updated += 1;
  }

  await admin.from("activity_log").insert({
    company_id: actor.companyId,
    user_id: actor.id,
    // The activity log's existing word for a bulk load of sheet data.
    action_type: "data_migrated",
    description: `Master sheet upload: ${inserted} new, ${updated} updated`,
    metadata: { inserted, updated, file: file.name },
  } as never);

  logger.info("vehicle-import", "done", { inserted, updated });
  return NextResponse.json({ ...summary, inserted, updated });
}
