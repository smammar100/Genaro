"use client";

import type * as React from "react";
import { Badge, Button, IndexTable, Link, Tooltip } from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";
import { StatusPill } from "./status-pill";
import { ProviderBadge } from "./provider-badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { daysRemaining, effectiveWarrantyStatus } from "@/lib/warranty-status";
import { usePermissions } from "@/hooks/use-permissions";
import type { Vehicle, Warranty, WarrantyClaim } from "@/lib/types";

export interface WarrantyRow extends Warranty {
  vehicle: Vehicle | null;
  claimCount: number;
}

interface WarrantyTableProps {
  rows: WarrantyRow[];
  variant: "in-house" | "external";
  onRowClick: (warranty: WarrantyRow) => void;
  onFileClaim?: (warranty: WarrantyRow) => void;
  onMarkPurchased?: (warranty: WarrantyRow) => void;
}

function remainingLabel(endDate: string): string {
  const d = daysRemaining(endDate);
  if (d < 0) return `Expired ${-d}d ago`;
  if (d === 0) return "Ends today";
  if (d < 60) return `${d}d remaining`;
  const months = Math.round(d / 30);
  return `${months}mo remaining`;
}

/** Elapsed fraction (0–100) of the coverage window, clamped. */
function elapsedPct(startDate: string, endDate: string): number {
  const s = new Date(startDate).getTime();
  const e = new Date(endDate).getTime();
  if (!(e > s)) return 100;
  const now = Date.now();
  return Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)));
}

/** Active cover ending within 30 days — the caution lane (not yet expired). */
function isExpiring(row: WarrantyRow): boolean {
  const d = daysRemaining(row.endDate);
  return (
    effectiveWarrantyStatus(row) === "active" && d >= 0 && d <= 30
  );
}

/**
 * Coverage progress: success fill while healthy, caution when expiring,
 * disabled grey once expired. Polaris ProgressBar has no caution tone, so
 * this is the same 8px track drawn from the fill tokens.
 */
function CoverageBar({ row }: { row: WarrantyRow }) {
  const tone =
    effectiveWarrantyStatus(row) === "expired"
      ? "bg-(--bg-fill-disabled)"
      : isExpiring(row)
        ? "bg-(--bg-fill-caution)"
        : "bg-(--bg-fill-success)";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--bg-fill-secondary)">
      <div
        className={cn("h-full rounded-full", tone)}
        style={{ width: `${elapsedPct(row.startDate, row.endDate)}%` }}
      />
    </div>
  );
}

function VehicleCell({ vehicle }: { vehicle: Vehicle | null }) {
  if (!vehicle) return <span className="text-(--text-secondary)">—</span>;
  return (
    <div className="flex items-center gap-2">
      <RegPlate registration={vehicle.registration} size="sm" />
      <span className="body-sm text-(--text-secondary)">
        {vehicle.make} {vehicle.model}
      </span>
    </div>
  );
}

function CoverageCell({ row }: { row: WarrantyRow }) {
  return (
    <div className="flex min-w-40 flex-col gap-1">
      <CoverageBar row={row} />
      <span className="body-sm tabular-nums text-(--text-secondary)">
        {formatDate(row.startDate)} → {formatDate(row.endDate)}
      </span>
    </div>
  );
}

/**
 * IndexTable rows only link by `url`; these rows open a sheet instead. The
 * name in the primary cell is the keyboard route, and a click anywhere else
 * on the row is delegated here so the whole row stays a target. Clicks on
 * the row's own buttons and links are left to them.
 */
function RowClickArea<T>({
  rows,
  onRowClick,
  children,
}: {
  rows: T[];
  onRowClick?: (row: T) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={onRowClick ? "[&_tbody_tr]:cursor-pointer" : undefined}
      onClick={(e) => {
        if (!onRowClick) return;
        const target = e.target as HTMLElement;
        if (target.closest("button, a, input, [data-row-action]")) return;
        const tr = target.closest("tbody tr");
        if (!tr?.parentElement) return;
        const index = Array.prototype.indexOf.call(tr.parentElement.children, tr);
        const row = rows[index];
        if (row) onRowClick(row);
      }}
    >
      {children}
    </div>
  );
}

export function WarrantyTable({
  rows,
  variant,
  onRowClick,
  onFileClaim,
  onMarkPurchased,
}: WarrantyTableProps) {
  const headings =
    variant === "in-house"
      ? [
          { title: "Vehicle" },
          { title: "Customer" },
          { title: "Coverage period" },
          { title: "Remaining" },
          { title: "Claims", alignment: "end" as const },
          { title: "Status" },
          { title: "Actions" },
        ]
      : [
          { title: "Vehicle" },
          { title: "Customer" },
          { title: "Provider" },
          { title: "Coverage" },
          { title: "Purchase" },
          { title: "Cost", alignment: "end" as const },
          { title: "Status" },
          { title: "Actions" },
        ];

  return (
    <RowClickArea rows={rows} onRowClick={onRowClick}>
      <IndexTable
        className="rounded-none shadow-none"
        selectable={false}
        primaryColumn={1}
        headings={headings}
        rows={rows.map((row) => {
          const customer = (
            <div key="customer" className="flex flex-col">
              <Link monochrome removeUnderline onClick={() => onRowClick(row)}>
                {row.customerName}
              </Link>
              <span className="body-sm font-normal text-(--text-secondary)">
                {row.customerPhone}
              </span>
            </div>
          );
          const status = (
            <StatusPill key="status" status={effectiveWarrantyStatus(row)} />
          );
          const actions = (
            <RowActions
              key="actions"
              row={row}
              variant={variant}
              onFileClaim={onFileClaim}
              onMarkPurchased={onMarkPurchased}
            />
          );
          const cells: React.ReactNode[] =
            variant === "in-house"
              ? [
                  <VehicleCell key="vehicle" vehicle={row.vehicle} />,
                  customer,
                  <CoverageCell key="coverage" row={row} />,
                  <span
                    key="remaining"
                    className={
                      isExpiring(row)
                        ? "body-sm text-(--text-caution)"
                        : "body-sm text-(--text-secondary)"
                    }
                  >
                    {remainingLabel(row.endDate)}
                  </span>,
                  <span
                    key="claims"
                    className={
                      row.claimCount > 0
                        ? "tabular-nums"
                        : "tabular-nums text-(--text-secondary)"
                    }
                  >
                    {row.claimCount}
                  </span>,
                  status,
                  actions,
                ]
              : [
                  <VehicleCell key="vehicle" vehicle={row.vehicle} />,
                  customer,
                  <ProviderBadge key="provider" provider={row.provider} />,
                  <CoverageCell key="coverage" row={row} />,
                  <StatusPill key="purchase" status={row.purchaseStatus} />,
                  <span key="cost" className="tabular-nums">
                    {formatCurrency(row.costToDealership)}
                  </span>,
                  status,
                  actions,
                ];
          return { id: row.id, cells };
        })}
      />
    </RowClickArea>
  );
}

/** Wraps a disabled action so the reason shows on hover and focus. */
function WithReason({
  reason,
  children,
}: {
  reason?: string;
  children: React.ReactNode;
}) {
  return reason ? (
    <Tooltip content={reason} preferredPosition="left">
      {children}
    </Tooltip>
  ) : (
    <>{children}</>
  );
}

function RowActions({
  row,
  variant,
  onFileClaim,
  onMarkPurchased,
}: {
  row: WarrantyRow;
  variant: "in-house" | "external";
  onFileClaim?: (warranty: WarrantyRow) => void;
  onMarkPurchased?: (warranty: WarrantyRow) => void;
}) {
  const { can } = usePermissions();
  const canEdit = can("warranty:edit");
  const isPendingExternal =
    variant === "external" && row.purchaseStatus === "pending";

  if (isPendingExternal) {
    return (
      <span data-row-action>
        <WithReason
          reason={canEdit ? undefined : "Requires Warranty Edit capability"}
        >
          <Button
            size="micro"
            onClick={() => onMarkPurchased?.(row)}
            disabled={!canEdit}
          >
            Mark purchased
          </Button>
        </WithReason>
      </span>
    );
  }

  const canClaim = row.status === "active";
  return (
    <span data-row-action>
      <WithReason
        reason={canClaim ? undefined : "Can only file claims on active warranties"}
      >
        <Button
          size="micro"
          variant="tertiary"
          onClick={() => onFileClaim?.(row)}
          disabled={!canClaim}
        >
          File claim
        </Button>
      </WithReason>
    </span>
  );
}

interface ClaimsRow extends WarrantyClaim {
  vehicle: Vehicle | null;
  warranty: Warranty | null;
}

export function ClaimsTable({
  rows,
  onRowClick,
}: {
  rows: ClaimsRow[];
  onRowClick?: (claim: ClaimsRow) => void;
}) {
  return (
    <RowClickArea rows={rows} onRowClick={onRowClick}>
      <IndexTable
        className="rounded-none shadow-none"
        selectable={false}
        primaryColumn={1}
        headings={[
          { title: "Vehicle" },
          { title: "Customer" },
          { title: "Issue" },
          { title: "Warranty" },
          { title: "Cost", alignment: "end" },
          { title: "Status" },
        ]}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            <VehicleCell key="vehicle" vehicle={row.vehicle} />,
            <div key="customer" className="flex flex-col items-start gap-1">
              {onRowClick ? (
                <Link monochrome removeUnderline onClick={() => onRowClick(row)}>
                  {row.customerName}
                </Link>
              ) : (
                row.customerName
              )}
              {row.isComplaint && (
                <Badge tone="critical">Complaint</Badge>
              )}
            </div>,
            <span key="issue" className="block max-w-64 truncate font-normal">
              {row.issueDescription}
            </span>,
            <span key="warranty" className="body-sm text-(--text-secondary)">
              {row.warranty
                ? row.warranty.type === "external"
                  ? row.warranty.provider ?? "External"
                  : "In-house"
                : "—"}
            </span>,
            <span key="cost" className="tabular-nums">
              {formatCurrency(row.actualCost ?? row.estimatedCost ?? 0)}
            </span>,
            <StatusPill key="status" status={row.status} />,
          ],
        }))}
      />
    </RowClickArea>
  );
}
