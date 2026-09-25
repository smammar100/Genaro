"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Layout,
  type BadgeTone,
} from "@/components/polaris";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/auth-context";
import { backupService } from "@/lib/services/backup-service";
import {
  backupFilename,
  getBackupStatus,
  type BackupStatus,
} from "@/lib/backup-schedule";
import { formatDateTime } from "@/lib/utils";

const URGENCY_BADGE: Record<BackupStatus["urgency"], { label: string; tone: BadgeTone }> = {
  never: { label: "Not backed up", tone: "critical" },
  due: { label: "Due", tone: "attention" },
  ok: { label: "Up to date", tone: "success" },
};

/**
 * Settings › Backup (GEN-90).
 *
 * A deliberately manual export: the user asks for it and receives the file
 * directly. The panel's real job is making the *state* legible — when the last
 * backup was, and whether one is due — because a manual backup nobody is
 * reminded about is a backup nobody takes.
 */
export function BackupPanel() {
  const { company, user } = useAuth();
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  /**
   * `loading` starts true and is only cleared after the await, so nothing sets
   * state synchronously inside the effect body — that pattern triggers a
   * cascading re-render on mount.
   */
  const refresh = useCallback(async () => {
    const companyId = company?.id;
    if (!companyId) return;
    const at = await backupService.getLastBackupAt(companyId);
    setLastBackupAt(at);
    setLoading(false);
  }, [company]);

  useEffect(() => {
    let cancelled = false;
    const companyId = company?.id;
    if (!companyId) return;
    void backupService.getLastBackupAt(companyId).then((at) => {
      if (cancelled) return;
      setLastBackupAt(at);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [company]);

  async function handleDownload() {
    if (!company?.id || !user?.id) return;
    setBusy(true);
    try {
      const result = await backupService.createBackup(
        company.id,
        user.id,
        backupFilename(company.name),
      );
      if (result.recorded) {
        toast.success(
          `Backup downloaded — ${result.rows.toLocaleString()} rows across ${result.sheets} sheets.`,
        );
      } else {
        // The file is in the user's hands, which is what matters; be honest
        // that the reminder cannot reset until the migration is applied.
        toast.success(
          "Backup downloaded, but it could not be recorded — the reminder will stay due.",
        );
      }
      await refresh();
    } catch {
      toast.error("Could not build the backup. Nothing was downloaded.");
    } finally {
      setBusy(false);
    }
  }

  const status: BackupStatus = getBackupStatus(lastBackupAt);

  const badge = URGENCY_BADGE[status.urgency];

  return (
    <Layout>
      <Layout.AnnotatedSection
        title="Data backup"
        description="Download a complete copy of your data (vehicles, inspections, deals, invoices, customers and more) as an Excel workbook. Take one weekly so a problem can never cost you more than a week."
      >
        <Card
          title="Status"
          actions={loading ? null : <Badge tone={badge.tone}>{badge.label}</Badge>}
        >
          <div
            className="text-sm text-(--text)"
            data-testid="backup-status"
            aria-live="polite"
          >
            {loading ? "Checking…" : status.message}
          </div>
          {lastBackupAt && !loading && (
            <div className="text-xs text-(--text-secondary)">
              Last backup: {formatDateTime(lastBackupAt)}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              icon={<Download className="size-4" />}
              onClick={() => void handleDownload()}
              loading={busy}
              disabled={loading}
            >
              {busy ? "Preparing backup…" : "Download data backup"}
            </Button>
          </div>
        </Card>
      </Layout.AnnotatedSection>
    </Layout>
  );
}
