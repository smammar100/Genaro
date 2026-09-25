import { Badge } from "@/components/ui/badge";
import {
  VEHICLE_STATUSES,
  MAINTENANCE_STATUSES,
  salesStageLabel,
} from "@/lib/constants";
import type {
  MaintenanceStatus,
  SalesStage,
  VehicleStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The status colour names used in lib/constants → Polaris Badge tones.
 * Pink (Reserved, Deposit taken) has no Polaris tone of its own, so it is the
 * strong info badge — distinct from the plain info of Received / New lead.
 */
type Tone = "info" | "attention" | "warning" | "success" | "magic" | "neutral" | "critical";
const COLOR_TONES: Record<string, { tone: Tone; strong?: boolean }> = {
  blue: { tone: "info" },
  yellow: { tone: "attention" },
  orange: { tone: "warning" },
  green: { tone: "success" },
  purple: { tone: "magic" },
  pink: { tone: "info", strong: true },
  gray: { tone: "neutral" },
  red: { tone: "critical" },
};

function ToneBadge({
  color,
  className,
  children,
}: {
  color: string | undefined;
  className?: string;
  children: ReactNode;
}) {
  const { tone, strong } = COLOR_TONES[color ?? "gray"] ?? COLOR_TONES.gray;
  return (
    <Badge variant={tone} className={cn(strong && "p-badge--strong", className)}>
      {children}
    </Badge>
  );
}

interface VehicleStatusBadgeProps {
  status: VehicleStatus;
  className?: string;
  /** Show a caret — for a badge that opens a status menu. */
  withChevron?: boolean;
}

export function VehicleStatusBadge({
  status,
  className,
  withChevron,
}: VehicleStatusBadgeProps) {
  const meta = VEHICLE_STATUSES.find((s) => s.value === status);
  if (!meta) return <Badge variant="neutral">{status}</Badge>;
  return (
    <ToneBadge color={meta.color} className={className}>
      {meta.label}
      {withChevron && <ChevronDown aria-hidden className="-mr-0.5 size-3" />}
    </ToneBadge>
  );
}

const MAINTENANCE_COLORS: Record<MaintenanceStatus, string> = {
  pending: "yellow",
  in_progress: "blue",
  completed: "green",
  stalled: "red",
};

interface MaintenanceStatusBadgeProps {
  status: MaintenanceStatus;
  className?: string;
}

export function MaintenanceStatusBadge({
  status,
  className,
}: MaintenanceStatusBadgeProps) {
  const meta = MAINTENANCE_STATUSES.find((s) => s.value === status);
  return (
    <ToneBadge color={MAINTENANCE_COLORS[status]} className={className}>
      {meta?.label ?? status}
    </ToneBadge>
  );
}

// Stages are user-configurable, so this is a best-effort accent keyed by the
// shipped slugs; anything unrecognised (a custom stage) falls back to gray.
const STAGE_COLORS: Record<string, string> = {
  new_lead: "blue",
  contacted: "purple",
  test_drive: "orange",
  offer_made: "yellow",
  deposit_taken: "pink",
  collection_delivery: "purple",
  completed_sale: "green",
  lost: "gray",
};

interface SalesStageBadgeProps {
  stage: SalesStage;
  className?: string;
}

export function SalesStageBadge({ stage, className }: SalesStageBadgeProps) {
  return (
    <ToneBadge color={STAGE_COLORS[stage]} className={className}>
      {salesStageLabel(stage)}
    </ToneBadge>
  );
}
