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

const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-[#d5ebff] text-[#003a5a] border-transparent",
  yellow:
    "bg-[#ffeb78] text-[#4f4700] border-transparent",
  orange:
    "bg-[#ffd6a4] text-[#5e2e00] border-transparent",
  green:
    "bg-[#affebf] text-[#014b40] border-transparent",
  purple:
    "bg-[#f0e8ff] text-[#5700d1] border-transparent",
  pink: "bg-[#ffe3f3] text-[#8d0448] border-transparent",
  gray: "bg-[#ebebeb] text-[#303030] border-transparent",
  red: "bg-[#fed1d7] text-[#8e0b21] border-transparent",
};

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
  if (!meta) return <Badge variant="outline">{status}</Badge>;
  return (
    <Badge
      variant="outline"
      className={cn(COLOR_CLASSES[meta.color], className)}
    >
      {meta.label}
      {withChevron && <ChevronDown aria-hidden className="-mr-0.5 size-3" />}
    </Badge>
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
    <Badge variant="outline" className={cn(COLOR_CLASSES[MAINTENANCE_COLORS[status]], className)}>
      {meta?.label ?? status}
    </Badge>
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
    <Badge
      variant="outline"
      className={cn(COLOR_CLASSES[STAGE_COLORS[stage] ?? "gray"], className)}
    >
      {salesStageLabel(stage)}
    </Badge>
  );
}
