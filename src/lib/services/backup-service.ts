import { createClient } from "@/lib/supabase/client";
import type { UUID } from "@/lib/types";
import { activityService } from "./activity-service";
import { downloadXlsx } from "@/lib/xlsx";
import { BACKUP_BUCKET, BACKUPS_KEPT, collectBackupSheets, type BackupClient } from "@/lib/backup-data";

/**
 * Full data backups (GEN-90).
 *
 * Car Capital lost a database once. Backups began as an export a person
 * takes and keeps; since 2026-11-07 one is also made every night and kept in
 * the app's private storage (the last 30, api/cron/backup), so there is
 * always a recent copy, and Download now still hands over a fresh file.
 *
 * The export is a multi-sheet workbook rather than JSON so it opens in Excel,
 * which is what the office already uses. Every table is dumped verbatim: the
 * point is reconstruction after a loss, not a tidy report.
 */

interface BackupResult {
  sheets: number;
  rows: number;
  /** False when the backup was produced but could not be recorded. */
  recorded: boolean;
}

/** A nightly backup in storage. */
export interface StoredBackup {
  /** Its path in the bucket, for a download link. */
  path: string;
  /** The night it was made, "YYYY-MM-DD". */
  day: string;
  /** When it was written. */
  createdAt: string;
  /** Size in bytes, when storage reports it. */
  size: number | null;
}

export const backupService = {
  /**
   * When the last backup was made, nightly or downloaded, or null if never.
   *
   * Downloads are in the activity log; nightly backups are the files in
   * storage. Returns null (which reads as "due") when neither can be read:
   * better to over-remind than to leave someone believing they are protected
   * when they are not.
   */
  async getLastBackupAt(companyId: UUID): Promise<string | null> {
    const [downloaded, stored] = await Promise.all([
      lastDownloadedAt(companyId),
      backupService.listStored(companyId).then((list) => list[0]?.createdAt ?? null),
    ]);
    if (!downloaded) return stored;
    if (!stored) return downloaded;
    return downloaded > stored ? downloaded : stored;
  },

  /**
   * The nightly backups kept for the company, newest first. Empty before
   * migration 0067 adds the bucket, or before the first night has run.
   */
  async listStored(companyId: UUID): Promise<StoredBackup[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(BACKUP_BUCKET)
        .list(companyId, { limit: BACKUPS_KEPT + 5, sortBy: { column: "name", order: "desc" } });
      if (error || !data) return [];
      return data
        .filter((f) => f.name.endsWith(".xlsx"))
        .map((f) => ({
          path: `${companyId}/${f.name}`,
          day: f.name.replace(/\.xlsx$/, ""),
          createdAt: f.updated_at ?? f.created_at ?? `${f.name.replace(/\.xlsx$/, "")}T02:00:00Z`,
          size: typeof f.metadata?.size === "number" ? f.metadata.size : null,
        }));
    } catch {
      return [];
    }
  },

  /** A short-lived link that downloads one nightly backup. */
  async storedDownloadUrl(backup: StoredBackup, filename: string): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .createSignedUrl(backup.path, 60, { download: filename });
    if (error || !data) throw new Error(error?.message ?? "Couldn't open that backup");
    return data.signedUrl;
  },

  /**
   * Gather every table and hand the user a workbook.
   *
   * Throws if the data cannot be read — a partial backup is worse than none,
   * because it looks like protection. Recording the event is best-effort: if
   * the audit write fails (e.g. migration 0044 not yet applied) the user still
   * gets their file, and `recorded: false` says the reminder cannot reset.
   */
  async createBackup(companyId: UUID, actorId: UUID, filename: string): Promise<BackupResult> {
    const { sheets, rows } = await collectBackupSheets(createClient() as unknown as BackupClient, companyId);
    downloadXlsx(sheets, filename);

    let recorded = true;
    try {
      await activityService.log({
        companyId,
        userId: actorId,
        vehicleId: null,
        actionType: "data_backup_created",
        description: `Data backup downloaded (${rows} rows across ${sheets.length} sheets)`,
        metadata: { filename, rows, sheets: sheets.length },
      });
    } catch {
      recorded = false;
    }

    return { sheets: sheets.length, rows, recorded };
  },
};

/** When someone last downloaded a backup, from the activity log. */
async function lastDownloadedAt(companyId: UUID): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("activity_log")
      .select("created_at")
      .eq("company_id", companyId)
      .eq("action_type", "data_backup_created")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) return null;
    return (data?.[0]?.created_at as string | undefined) ?? null;
  } catch {
    return null;
  }
}
