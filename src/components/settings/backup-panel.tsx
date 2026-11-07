"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Badge, Button, Card } from "@/components/genaro";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/auth-context";
import { backupService, type StoredBackup } from "@/lib/services/backup-service";
import { backupFilename, getBackupStatus } from "@/lib/backup-schedule";

/** Nightly backups shown before "Show all". */
const SHOWN = 7;

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const sizeLabel = (bytes: number | null) =>
  bytes === null ? null : bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * "today at 02:00", "yesterday at 02:00", then whole days elapsed, counted as
 * the Overdue check counts them, so "7 days ago" and Overdue always agree.
 */
function whenLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const calendarDays = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  );
  if (calendarDays <= 0) return `today at ${timeLabel(iso)}`;
  if (calendarDays === 1) return `yesterday at ${timeLabel(iso)}`;
  const days = getBackupStatus(iso, now).daysSince ?? calendarDays;
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Settings › Backup (GEN-90). A copy of everything is made every night and
 * kept here (the last 30, api/cron/backup); Download now hands over a fresh
 * one at any time. The card says when the last copy was made and lists the
 * nightly ones to download. A tag shows only when a backup is overdue.
 */
export function BackupPanel() {
  const { company, user } = useAuth();
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [stored, setStored] = useState<StoredBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function load(companyId: string) {
    const [at, list] = await Promise.all([
      backupService.getLastBackupAt(companyId),
      backupService.listStored(companyId),
    ]);
    setLastBackupAt(at);
    setStored(list);
    setLoading(false);
  }

  useEffect(() => {
    const companyId = company?.id;
    if (!companyId) return;
    let cancelled = false;
    void Promise.all([backupService.getLastBackupAt(companyId), backupService.listStored(companyId)]).then(
      ([at, list]) => {
        if (cancelled) return;
        setLastBackupAt(at);
        setStored(list);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [company]);

  async function handleDownload() {
    if (!company?.id || !user?.id) return;
    setBusy(true);
    try {
      const result = await backupService.createBackup(company.id, user.id, backupFilename(company.name));
      toast.success(`Backup downloaded: ${result.rows.toLocaleString("en-GB")} rows across ${result.sheets} sheets.`);
      await load(company.id);
    } catch {
      toast.error("Couldn't build the backup. Nothing was downloaded.");
    } finally {
      setBusy(false);
    }
  }

  async function openStored(backup: StoredBackup) {
    if (!company) return;
    setOpening(backup.path);
    try {
      const url = await backupService.storedDownloadUrl(backup, backupFilename(company.name, new Date(`${backup.day}T12:00:00`)));
      window.location.assign(url);
    } catch {
      toast.error("Couldn't download that backup. Try again.");
    } finally {
      setOpening(null);
    }
  }

  const status = getBackupStatus(lastBackupAt);
  const headline = loading
    ? "Checking…"
    : lastBackupAt
      ? `Last backed up ${whenLabel(lastBackupAt)}`
      : "No backup yet";
  const shown = showAll ? stored : stored.slice(0, SHOWN);

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-title font-semibold tabular-nums" aria-live="polite" data-testid="backup-status">
                {headline}
              </p>
              {!loading && status.urgency === "due" ? <Badge tone="attention">Overdue</Badge> : null}
            </div>
            <p className="body-md text-(--text-secondary)">
              {loading || stored.length > 0
                ? "A copy of everything is saved automatically every night at 2am, and the last 30 are kept below. Download one now whenever you want a copy of your own."
                : "A copy of everything is saved automatically every night at 2am, and the last 30 are kept here; the first is made tonight. Download one now whenever you want a copy of your own."}
            </p>
          </div>
          <Button
            variant="primary"
            icon={<Download className="size-4" />}
            onClick={() => void handleDownload()}
            loading={busy}
            disabled={loading}
          >
            {busy ? "Preparing backup…" : "Download now"}
          </Button>
        </div>

        {!loading && stored.length > 0 ? (
          <div className="flex flex-col gap-1">
            <ul aria-label="Nightly backups" className="flex flex-col">
              {shown.map((b) => (
                <li key={b.path} className="flex min-h-11 items-center gap-3">
                  <span className="body-md min-w-0 flex-1">{dayLabel(`${b.day}T12:00:00`)}</span>
                  <span className="body-sm tabular-nums text-(--text-secondary) max-sm:hidden">
                    {[timeLabel(b.createdAt), sizeLabel(b.size)].filter(Boolean).join(" · ")}
                  </span>
                  <Button
                    variant="tertiary"
                    icon={<Download className="size-4" />}
                    loading={opening === b.path}
                    onClick={() => void openStored(b)}
                    accessibilityLabel={`Download the backup from ${dayLabel(`${b.day}T12:00:00`)}`}
                  />
                </li>
              ))}
            </ul>
            {stored.length > SHOWN ? (
              <div>
                <Button variant="plain" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Show fewer" : `Show all ${stored.length}`}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
