import { Badge, type BadgeProgress, type BadgeTone } from "@/components/polaris";
import type {
  ClaimStatus,
  WarrantyPurchaseStatus,
  WarrantyStatus,
} from "@/lib/types";

/**
 * Status badge for any warranty- or claim-related status value — a Polaris
 * Badge, so tone and theming come from the design system.
 */

type AnyStatus = WarrantyStatus | ClaimStatus | WarrantyPurchaseStatus;

interface StatusSpec {
  label: string;
  tone?: BadgeTone;
  progress?: BadgeProgress;
}

const SPECS: Record<AnyStatus, StatusSpec> = {
  // Warranty lifecycle
  active: { label: "Active", tone: "success" },
  expired: { label: "Expired" },
  cancelled: { label: "Cancelled" },

  // Claim lifecycle
  open: { label: "Open", tone: "critical" },
  under_review: { label: "Under review", tone: "attention" },
  approved: { label: "Approved", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
  rejected: { label: "Rejected" },

  // Purchase tracker
  pending: { label: "Pending purchase", tone: "attention", progress: "incomplete" },
  purchased: { label: "Purchased", tone: "success", progress: "complete" },
  n_a: { label: "—" },
};

interface StatusPillProps {
  status: AnyStatus;
  /** Show the progress pip on purchase statuses (default true). */
  withDot?: boolean;
  className?: string;
}

export function StatusPill({ status, withDot = true, className }: StatusPillProps) {
  const spec = SPECS[status];
  if (!spec) return null;
  return (
    <Badge
      tone={spec.tone}
      progress={withDot ? spec.progress : undefined}
      className={className}
    >
      {spec.label}
    </Badge>
  );
}
