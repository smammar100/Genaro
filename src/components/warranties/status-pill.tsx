"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ClaimStatus,
  WarrantyPurchaseStatus,
  WarrantyStatus,
} from "@/lib/types";

/**
 * Visual pill for any warranty- or claim-related status value. Uses the app's
 * Badge primitive so it inherits the global theme — never hard-codes hex.
 */

type AnyStatus = WarrantyStatus | ClaimStatus | WarrantyPurchaseStatus;

interface VariantSpec {
  /** Maps to the shadcn Badge variants the app already uses. */
  variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
  /** Optional dot colour (Tailwind class). Falls back to currentColor. */
  dotClass?: string;
  /** Optional extra classes to tint the badge — kept token-driven. */
  extraClass?: string;
  /** Human label override if the raw status isn't presentable. */
  label?: string;
}

const SPECS: Record<AnyStatus, VariantSpec> = {
  // Warranty lifecycle
  active: { variant: "success" },
  expired: { variant: "default" },
  cancelled: { variant: "default" },

  // Claim lifecycle
  open: { variant: "destructive", label: "Open" },
  under_review: { variant: "warning", label: "Under review" },
  approved: { variant: "info", label: "Approved" },
  resolved: { variant: "success", label: "Resolved" },
  rejected: { variant: "default", label: "Rejected" },

  // Purchase tracker
  pending: { variant: "warning", label: "Pending purchase" },
  purchased: { variant: "success", label: "Purchased" },
  n_a: { variant: "outline", extraClass: "text-muted-foreground", label: "—" },
};

interface StatusPillProps {
  status: AnyStatus;
  withDot?: boolean;
  className?: string;
}

export function StatusPill({ status, withDot = true, className }: StatusPillProps) {
  const spec = SPECS[status];
  if (!spec) return null;
  const label = spec.label ?? status.replace(/_/g, " ");
  return (
    <Badge
      variant={spec.variant}
      className={cn(
        "inline-flex items-center gap-1.5 capitalize",
        spec.extraClass,
        className,
      )}
    >
      {withDot && spec.dotClass && (
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 rounded-full", spec.dotClass)}
        />
      )}
      {label}
    </Badge>
  );
}
