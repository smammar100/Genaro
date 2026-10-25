"use client";

import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  SalesStageBadge,
  VehicleStatusBadge,
} from "@/components/shared/status-badge";
import { RegPlate } from "@/components/shared/reg-plate";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { PHOTOS_ENABLED } from "@/lib/phase-one";
import {
  APPOINTMENT_OUTCOME_TONE,
  APPOINTMENT_STATUS_TONE,
  AT_INDICATOR_TONE,
  INVOICE_STATUS_TONE,
  LEAD_STATUS_TONE,
  RETURN_RESOLUTION_TONE,
  RETURN_STATUS_TONE,
  WARRANTY_STATUS_TONE,
  toneClass,
} from "@/lib/tone-maps";
import type {
  AppointmentOutcome,
  AppointmentStatus,
  InvoiceStatus,
  LeadStatus,
  ReturnResolutionPath,
  ReturnStatus,
  Vehicle,
  WarrantyStatus,
} from "@/lib/types";
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────────────────
// Generic value-shaped cells
// ────────────────────────────────────────────────────────────────────────────

/**
 * The dash a grid cell shows when it has no value.
 * @import import { EmptyCell } from "@/components/data-grid/cells";
 */
export function EmptyCell() {
  return <span className="text-muted-foreground">—</span>;
}

/**
 * Any value as plain text, cut to the column's width; a dash when it's empty.
 * @import import { TextCell } from "@/components/data-grid/cells";
 */
export function TextCell({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <EmptyCell />;
  return <span className="truncate">{String(value)}</span>;
}

/**
 * A phone number that dials when tapped, without opening the row.
 * @import import { PhoneCell } from "@/components/data-grid/cells";
 */
export function PhoneCell({ value }: { value: string | null | undefined }) {
  if (!value) return <EmptyCell />;
  const stripped = value.replace(/\s+/g, "");
  return (
    <a
      href={`tel:${stripped}`}
      className="tabular-nums hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {value}
    </a>
  );
}

/**
 * A number with UK thousands separators, in tabular figures.
 * @import import { NumberCell } from "@/components/data-grid/cells";
 */
export function NumberCell({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined || Number.isNaN(value))
    return <EmptyCell />;
  return (
    <span className="tabular-nums">
      {new Intl.NumberFormat("en-GB").format(value)}
    </span>
  );
}

/**
 * An amount in pounds (£16,419.00), in tabular figures.
 * @import import { CurrencyCell } from "@/components/data-grid/cells";
 */
export function CurrencyCell({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <EmptyCell />;
  return (
    <span className="tabular-nums">{formatCurrency(value)}</span>
  );
}

/**
 * A date as "21 Oct 2026", in tabular figures.
 * @import import { DateCell } from "@/components/data-grid/cells";
 */
export function DateCell({ value }: { value: string | null | undefined }) {
  if (!value) return <EmptyCell />;
  return <span className="tabular-nums">{formatDate(value)}</span>;
}

/**
 * A start and an end date joined by an arrow, such as a warranty's cover.
 * @import import { DateRangeCell } from "@/components/data-grid/cells";
 */
export function DateRangeCell({
  start,
  end,
}: {
  start: string | null | undefined;
  end: string | null | undefined;
}) {
  if (!start && !end) return <EmptyCell />;
  return (
    <span className="tabular-nums text-caption">
      {start ? formatDate(start) : "—"}
      <span className="px-1 text-muted-foreground">→</span>
      {end ? formatDate(end) : "—"}
    </span>
  );
}

/**
 * A yes or no as a small tick (yes) or cross (no and empty).
 * @import import { BooleanCell } from "@/components/data-grid/cells";
 */
export function BooleanCell({ value }: { value: boolean | null | undefined }) {
  if (value === true) {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-(--bg-fill-success-secondary) text-(--text-success)">
        <Check className="h-2.5 w-2.5" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <X className="h-2.5 w-2.5" />
    </span>
  );
}

/**
 * A value picked from a list as a grey chip, with underscores read as spaces.
 * @import import { SelectCell } from "@/components/data-grid/cells";
 */
export function SelectCell({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <EmptyCell />;
  return (
    <span className="inline-flex max-w-full items-center rounded-md bg-muted px-1.5 py-0.5 text-caption text-foreground">
      <span className="truncate">{String(value).replace(/_/g, " ")}</span>
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Domain-specific cells
// ────────────────────────────────────────────────────────────────────────────

/**
 * A vehicle as its reg plate over its stock ID, with a thumbnail when photos are on.
 * @import import { VehicleCell } from "@/components/data-grid/cells";
 */
export function VehicleCell({ vehicle }: { vehicle: Vehicle | null | undefined }) {
  if (!vehicle) return <EmptyCell />;
  return (
    <div className="flex items-center gap-2">
      {PHOTOS_ENABLED ? (
        <VehicleImage
          vehicle={vehicle}
          variant="thumb"
          className="size-10 shrink-0 rounded-lg shadow-(--shadow-border-inset)"
        />
      ) : null}
      <div className="flex min-w-0 flex-col gap-0.5">
        <RegPlate registration={vehicle.registration} size="sm" />
        <span className="font-code text-caption text-muted-foreground">
          {vehicle.stockId}
        </span>
      </div>
    </div>
  );
}

/**
 * A person as an initials avatar and their name.
 * @import import { UserCell } from "@/components/data-grid/cells";
 */
export function UserCell({ name }: { name: string | null | undefined }) {
  if (!name) return <EmptyCell />;
  return (
    <div className="flex items-center gap-2">
      <Avatar size="sm">
        <AvatarFallback className="text-micro">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-caption">{name}</span>
      </div>
    </div>
  );
}

/**
 * The advert channels a listing can go to, filled when it's on and grey when it's off.
 * @import import { ChannelsCell } from "@/components/data-grid/cells";
 */
export function ChannelsCell({
  channels,
}: {
  channels: Record<string, boolean>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(channels).map(([channel, enabled]) => (
        <span
          key={channel}
          className={cn(
            "rounded-md px-1.5 py-0.5 text-micro capitalize",
            enabled
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground",
          )}
        >
          {channel}
        </span>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pill cells — wrap existing badges where possible
// ────────────────────────────────────────────────────────────────────────────

/**
 * A vehicle's stock status as its VehicleStatusBadge.
 * @import import { VehicleStatusCell } from "@/components/data-grid/cells";
 */
export function VehicleStatusCell({
  status,
}: {
  status: Parameters<typeof VehicleStatusBadge>[0]["status"] | null | undefined;
}) {
  if (!status) return <EmptyCell />;
  return <VehicleStatusBadge status={status} />;
}

/**
 * A deal's pipeline stage as its SalesStageBadge.
 * @import import { SalesStageCell } from "@/components/data-grid/cells";
 */
export function SalesStageCell({
  stage,
}: {
  stage: Parameters<typeof SalesStageBadge>[0]["stage"] | null | undefined;
}) {
  if (!stage) return <EmptyCell />;
  return <SalesStageBadge stage={stage} />;
}

function tonePill(label: string, tone: string | undefined): ReactNode {
  return (
    <Badge variant="outline" className={cn(toneClass(tone))}>
      {label.replace(/_/g, " ")}
    </Badge>
  );
}

const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  appointment_booked: "Appointment",
  lost: "Lost",
};

/**
 * A lead's status (New, Contacted, Appointment, Lost) as a coloured pill.
 * @import import { LeadStatusCell } from "@/components/data-grid/cells";
 */
export function LeadStatusCell({
  status,
}: {
  status: LeadStatus | null | undefined;
}) {
  if (!status) return <EmptyCell />;
  return tonePill(LEAD_STATUS_LABEL[status] ?? status, LEAD_STATUS_TONE[status]);
}

const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

/**
 * An appointment's status (Upcoming, Completed, Cancelled, No-show) as a coloured pill.
 * @import import { AppointmentStatusCell } from "@/components/data-grid/cells";
 */
export function AppointmentStatusCell({
  status,
}: {
  status: AppointmentStatus | null | undefined;
}) {
  if (!status) return <EmptyCell />;
  return tonePill(
    APPOINTMENT_STATUS_LABEL[status] ?? status,
    APPOINTMENT_STATUS_TONE[status],
  );
}

const APPOINTMENT_OUTCOME_LABEL: Record<AppointmentOutcome, string> = {
  pending: "Pending",
  test_drive: "Test drive",
  offer_made: "Offer made",
  deposit_taken: "Deposit",
  sold: "Sold",
  lost: "Lost",
};

/**
 * What came of an appointment (Test drive, Offer made, Sold…) as a coloured pill.
 * @import import { AppointmentOutcomeCell } from "@/components/data-grid/cells";
 */
export function AppointmentOutcomeCell({
  outcome,
}: {
  outcome: AppointmentOutcome | null | undefined;
}) {
  if (!outcome) return <EmptyCell />;
  return tonePill(
    APPOINTMENT_OUTCOME_LABEL[outcome] ?? outcome,
    APPOINTMENT_OUTCOME_TONE[outcome],
  );
}

const WARRANTY_STATUS_LABEL: Record<WarrantyStatus, string> = {
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
};

/**
 * A warranty's status (Active, Expired, Cancelled) as a coloured pill.
 * @import import { WarrantyStatusCell } from "@/components/data-grid/cells";
 */
export function WarrantyStatusCell({
  status,
}: {
  status: WarrantyStatus | null | undefined;
}) {
  if (!status) return <EmptyCell />;
  return tonePill(
    WARRANTY_STATUS_LABEL[status] ?? status,
    WARRANTY_STATUS_TONE[status],
  );
}

const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  issued: "Issued",
  cancelled: "Cancelled",
};

/**
 * An invoice's status (Draft, Sent, Paid, Overdue…) as a coloured pill.
 * @import import { InvoiceStatusCell } from "@/components/data-grid/cells";
 */
export function InvoiceStatusCell({
  status,
}: {
  status: InvoiceStatus | null | undefined;
}) {
  if (!status) return <EmptyCell />;
  return tonePill(
    INVOICE_STATUS_LABEL[status] ?? status,
    INVOICE_STATUS_TONE[status],
  );
}

const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  pending: "Pending",
  in_review: "In review",
  resolved: "Resolved",
  rejected: "Rejected",
};

/**
 * A vehicle return's status (Pending, In review, Resolved, Rejected) as a coloured pill.
 * @import import { ReturnStatusCell } from "@/components/data-grid/cells";
 */
export function ReturnStatusCell({
  status,
}: {
  status: ReturnStatus | null | undefined;
}) {
  if (!status) return <EmptyCell />;
  return tonePill(
    RETURN_STATUS_LABEL[status] ?? status,
    RETURN_STATUS_TONE[status],
  );
}

const RETURN_RESOLUTION_LABEL: Record<ReturnResolutionPath, string> = {
  vendor: "Vendor",
  supplier: "Supplier",
  g_trader: "G-Trader",
  other: "Other",
};

/**
 * Who a vehicle return is settled through (Vendor, Supplier, G-Trader, Other) as a coloured pill.
 * @import import { ReturnResolutionCell } from "@/components/data-grid/cells";
 */
export function ReturnResolutionCell({
  resolution,
}: {
  resolution: ReturnResolutionPath | null | undefined;
}) {
  if (!resolution) return <EmptyCell />;
  return tonePill(
    RETURN_RESOLUTION_LABEL[resolution] ?? resolution,
    RETURN_RESOLUTION_TONE[resolution],
  );
}

const AT_INDICATOR_LABEL: Record<string, string> = {
  great: "Great price",
  good: "Good price",
  above_average: "Above avg",
  high: "Overpriced",
  unrated: "Unrated",
};

/**
 * AutoTrader's price indicator (Great price to Overpriced) as a coloured pill.
 * @import import { AtIndicatorCell } from "@/components/data-grid/cells";
 */
export function AtIndicatorCell({
  indicator,
}: {
  indicator: string | null | undefined;
}) {
  if (!indicator) return <EmptyCell />;
  return tonePill(
    AT_INDICATOR_LABEL[indicator] ?? indicator,
    AT_INDICATOR_TONE[indicator],
  );
}
