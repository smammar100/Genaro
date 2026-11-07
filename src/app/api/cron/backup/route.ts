/**
 * Nightly data backup (GEN-90, 2026-11-07): for every company, the same
 * workbook as Settings → Backup's Download now, saved to the private
 * `backups` bucket (0067) as `<company id>/<YYYY-MM-DD>.xlsx`. The last 30
 * nights are kept; older files are deleted. Settings lists them for download,
 * and the Backup due reminder counts them, so it stays quiet while this runs.
 *
 * Runs at 02:00 UTC via Vercel Cron (vercel.json). Re-running on the same day
 * replaces that day's file.
 *
 * The service role skips row security, so collectBackupSheets filters every
 * table to the company itself.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` — Vercel Cron sends this
 * automatically when the env var is set. 401 otherwise.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { buildXlsx } from "@/lib/xlsx";
import { BACKUP_BUCKET, BACKUPS_KEPT, backupObjectPath, collectBackupSheets, type BackupClient } from "@/lib/backup-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A stock book of a few thousand cars and its history takes a while to read.
export const maxDuration = 300;

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.error("backup", "CRON_SECRET not set");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: companies, error } = await admin.from("companies").select("id");
  if (error) {
    logger.error("backup", "couldn't list companies", { message: error.message });
    return NextResponse.json({ error: "companies_unreadable" }, { status: 500 });
  }

  const results: { companyId: string; ok: boolean; rows?: number; error?: string }[] = [];
  for (const { id } of companies ?? []) {
    try {
      const { sheets, rows } = await collectBackupSheets(admin as unknown as BackupClient, id);
      const bytes = buildXlsx(sheets);
      const { error: upErr } = await admin.storage
        .from(BACKUP_BUCKET)
        .upload(backupObjectPath(id), bytes, { contentType: XLSX_TYPE, upsert: true });
      if (upErr) throw new Error(upErr.message);

      // Keep the newest 30; file names are dates, so name order is age order.
      const { data: files } = await admin.storage
        .from(BACKUP_BUCKET)
        .list(id, { limit: 1000, sortBy: { column: "name", order: "desc" } });
      const old = (files ?? [])
        .filter((f) => f.name.endsWith(".xlsx"))
        .slice(BACKUPS_KEPT)
        .map((f) => `${id}/${f.name}`);
      if (old.length) await admin.storage.from(BACKUP_BUCKET).remove(old);

      results.push({ companyId: id, ok: true, rows });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      logger.error("backup", `backup failed for ${id}`, { message });
      results.push({ companyId: id, ok: false, error: message });
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  return NextResponse.json({ companies: results.length, failed, results }, { status: failed ? 207 : 200 });
}
