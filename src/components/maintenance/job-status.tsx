import { Badge, type BadgeProgress, type BadgeTone } from "@/components/polaris";
import { MAINTENANCE_STATUSES } from "@/lib/constants";
import type { MaintenanceStatus } from "@/lib/types";

/**
 * Polaris tone + progress pip for each maintenance status, so a job reads the
 * same on the pipeline, the job page and the edit dialog.
 */
export const JOB_STATUS_BADGE: Record<
  MaintenanceStatus,
  { tone: BadgeTone; progress?: BadgeProgress }
> = {
  pending: { tone: "attention", progress: "incomplete" },
  in_progress: { tone: "info", progress: "partiallyComplete" },
  completed: { tone: "success", progress: "complete" },
  stalled: { tone: "critical" },
};

/** Sentence-case label ("In progress") for a maintenance status. */
export function jobStatusLabel(status: MaintenanceStatus): string {
  const label =
    MAINTENANCE_STATUSES.find((s) => s.value === status)?.label ?? status;
  return label.charAt(0) + label.slice(1).toLowerCase();
}

export function JobStatusBadge({ status }: { status: MaintenanceStatus }) {
  const { tone, progress } = JOB_STATUS_BADGE[status];
  return (
    <Badge tone={tone} progress={progress}>
      {jobStatusLabel(status)}
    </Badge>
  );
}
