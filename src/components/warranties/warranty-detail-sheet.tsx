"use client";

import { useEffect, useState, type ReactNode } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Ban, ExternalLink as ExternalLinkIcon, ShieldAlert } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { warrantyService } from "@/lib/services/warranty-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { claimService } from "@/lib/services/claim-service";
import { invoiceService } from "@/lib/services/invoice-service";
import { teamService } from "@/lib/services/team-service";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import type {
  Invoice,
  User,
  Vehicle,
  Warranty,
  WarrantyClaim,
} from "@/lib/types";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Banner,
  Button,
  Card,
  Link,
  SkeletonBodyText,
  TextField,
  Tooltip,
} from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";
import { StatusPill } from "./status-pill";
import { ProviderBadge } from "./provider-badge";
import { MarkPurchasedDialog } from "./mark-purchased-dialog";
import { NewClaimDialog } from "./new-claim-dialog";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface WarrantyDetailSheetProps {
  warranty: Warranty | null;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

function daysRemaining(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (new Date(endDate).getTime() - today.getTime()) / 86_400_000,
  );
}

export function WarrantyDetailSheet({
  warranty,
  onOpenChange,
  onChanged,
}: WarrantyDetailSheetProps) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const pathname = usePathname();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [markPurchasedOpen, setMarkPurchasedOpen] = useState(false);
  const [fileClaimOpen, setFileClaimOpen] = useState(false);

  const open = warranty !== null;

  useEffect(() => {
    if (!warranty) return;
    void Promise.all([
      vehicleService.getById(warranty.vehicleId),
      claimService.getForWarranty(warranty.id),
      teamService.getAll(warranty.companyId),
      // Warranties issued by closing a sales invoice link back to it (GEN-66).
      warranty.invoiceId
        ? invoiceService.getById(warranty.invoiceId)
        : Promise.resolve(null),
    ]).then(([v, c, u, inv]) => {
      setVehicle(v);
      setClaims(c);
      setUsers(u);
      setInvoice(inv);
    });
  }, [warranty]);

  const purchaserName = warranty?.purchasedBy
    ? (users.find((u) => u.id === warranty.purchasedBy)?.name ?? null)
    : null;

  const canEdit = can("warranty:edit");

  if (!warranty) return null;

  const remaining = daysRemaining(warranty.endDate);
  const margin =
    warranty.type === "external"
      ? warranty.costToCustomer - warranty.costToDealership
      : null;
  const claimBlockedReason =
    warranty.status !== "active"
      ? "Can only file claims on active warranties"
      : undefined;
  const cancelBlockedReason = !canEdit
    ? "Requires Warranty Edit capability"
    : warranty.status === "cancelled"
      ? "Already cancelled"
      : undefined;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex w-full flex-col gap-0 bg-(--bg-surface-secondary) p-0 sm:max-w-[480px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-(--border) bg-(--bg-surface) px-4 py-3">
            <div className="flex min-w-0 flex-col">
              <SheetTitle className="heading-md">
                {warranty.type === "external" ? "External" : "In-house"} warranty
              </SheetTitle>
              <span className="body-sm truncate text-(--text-secondary)">
                {warranty.customerName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={warranty.status} />
              <Button
                variant="tertiary"
                icon="CancelMajor"
                accessibilityLabel="Close"
                onClick={() => onOpenChange(false)}
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-4">
              <Card title="Vehicle">
                {vehicle ? (
                  <NextLink
                    href={vehicleDetailHref(vehicle.id, pathname)}
                    className="-m-1 flex items-center justify-between gap-2 rounded-(--radius-200) p-1 transition-colors hover:bg-(--bg-surface-hover)"
                  >
                    <div className="flex items-center gap-2">
                      <RegPlate
                        registration={vehicle.registration}
                        size="sm"
                      />
                      <div className="flex flex-col">
                        <span className="body-md">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </span>
                        <span className="body-sm text-(--text-secondary)">
                          Stock {vehicle.stockId}
                        </span>
                      </div>
                    </div>
                    <ExternalLinkIcon className="h-3.5 w-3.5 text-(--icon-secondary)" />
                  </NextLink>
                ) : (
                  <SkeletonBodyText lines={2} />
                )}
              </Card>

              <Card title="Customer">
                <div className="body-md">{warranty.customerName}</div>
                <div className="body-sm text-(--text-secondary)">
                  {warranty.customerPhone}
                  {warranty.customerEmail && ` · ${warranty.customerEmail}`}
                </div>
              </Card>

              <Card
                title="Coverage"
                actions={<ProviderBadge provider={warranty.provider} />}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="body-sm text-(--text-secondary)">
                    {formatDate(warranty.startDate)} →{" "}
                    {formatDate(warranty.endDate)}
                  </span>
                  <span
                    className={cn(
                      "body-sm",
                      remaining < 0
                        ? "text-(--text-critical)"
                        : remaining < 30
                          ? "text-(--text-caution)"
                          : "text-(--text-secondary)",
                    )}
                  >
                    {remaining < 0
                      ? `Expired ${-remaining}d ago`
                      : `${remaining}d remaining`}
                  </span>
                </div>
                <p className="body-md">{warranty.coverageDetails}</p>
                {/* Where this cover came from. Warranties issued by closing a
                    sales invoice link straight back to it (GEN-66); ones
                    raised by hand in this module have no invoice. */}
                {invoice ? (
                  <span className="body-sm text-(--text-secondary)">
                    Issued by invoice{" "}
                    <Link url={`/sales/invoice-generation?invoiceId=${invoice.id}`}>
                      {invoice.invoiceNumber}
                    </Link>
                  </span>
                ) : null}
              </Card>

              <Card title="Pricing">
                <dl className="flex flex-col gap-1">
                  <PriceRow
                    label="Cost to customer"
                    value={formatCurrency(warranty.costToCustomer)}
                  />
                  {warranty.type === "external" && (
                    <>
                      <PriceRow
                        label="Cost to dealership"
                        value={formatCurrency(warranty.costToDealership)}
                      />
                      {warranty.amountPaid != null && (
                        <PriceRow
                          label="Amount paid to provider"
                          value={formatCurrency(warranty.amountPaid)}
                        />
                      )}
                      {margin !== null && (
                        <PriceRow
                          label="Margin"
                          value={formatCurrency(margin)}
                          strong
                          critical={margin < 0}
                        />
                      )}
                    </>
                  )}
                </dl>
              </Card>

              {/* Purchase status — external only */}
              {warranty.type === "external" &&
                (warranty.purchaseStatus === "pending" ? (
                  <Banner
                    tone="warning"
                    title="Not yet purchased"
                    action={
                      canEdit
                        ? {
                            content: "Mark purchased",
                            onAction: () => setMarkPurchasedOpen(true),
                          }
                        : undefined
                    }
                  >
                    This warranty hasn&apos;t been bought from the provider
                    yet.
                    {canEdit ? "" : " Requires Warranty Edit capability to mark it purchased."}
                  </Banner>
                ) : (
                  <Card title="Purchase status">
                    <div className="flex flex-col items-start gap-1">
                      <StatusPill status="purchased" />
                      {warranty.purchasedAt && (
                        <span className="body-sm text-(--text-secondary)">
                          Bought {formatDate(warranty.purchasedAt)}
                          {purchaserName && ` by ${purchaserName}`}
                        </span>
                      )}
                      {warranty.providerReference && (
                        <span className="body-sm text-(--text-secondary)">
                          Ref {warranty.providerReference}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}

              <Card title={`Claims (${claims.length})`}>
                {claims.length === 0 ? (
                  <p className="body-sm text-(--text-secondary)">
                    No claims filed against this warranty.
                  </p>
                ) : (
                  <ul className="-mx-4 -mb-4 flex flex-col">
                    {claims.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-start justify-between gap-2 border-t border-(--border-secondary) px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="body-md truncate">
                            {c.issueDescription}
                          </p>
                          <span className="body-sm text-(--text-secondary)">
                            {formatDate(c.createdAt)}
                            {c.isComplaint && " · Complaint"}
                          </span>
                        </div>
                        <StatusPill status={c.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-2 border-t border-(--border) bg-(--bg-surface) px-4 py-3">
            <MaybeTooltip reason={claimBlockedReason}>
              <Button
                icon={<ShieldAlert />}
                onClick={() => setFileClaimOpen(true)}
                disabled={!!claimBlockedReason}
              >
                File claim
              </Button>
            </MaybeTooltip>
            <MaybeTooltip reason={cancelBlockedReason}>
              <Button
                variant="tertiary"
                tone="critical"
                icon={<Ban />}
                onClick={() => setConfirmCancelOpen(true)}
                disabled={!!cancelBlockedReason}
              >
                Cancel warranty
              </Button>
            </MaybeTooltip>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm cancel — uses Dialog since alert-dialog isn't in the ui set */}
      <CancelConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        warranty={warranty}
        actorId={user?.id ?? null}
        onCancelled={() => {
          setConfirmCancelOpen(false);
          onOpenChange(false);
          onChanged?.();
        }}
      />

      {/* Mark purchased dialog */}
      <MarkPurchasedDialog
        open={markPurchasedOpen}
        onOpenChange={setMarkPurchasedOpen}
        warranty={warranty}
        onMarked={() => {
          setMarkPurchasedOpen(false);
          onChanged?.();
        }}
      />

      {/* File claim dialog with warranty prefilled */}
      <NewClaimDialog
        open={fileClaimOpen}
        onOpenChange={setFileClaimOpen}
        warrantyId={warranty.id}
        onCreated={() => {
          setFileClaimOpen(false);
          onChanged?.();
        }}
      />
    </>
  );
}

function CancelConfirmDialog({
  open,
  onOpenChange,
  warranty,
  actorId,
  onCancelled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: Warranty;
  actorId: string | null;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function confirm() {
    if (!actorId) return;
    setSubmitting(true);
    try {
      await warrantyService.cancel(warranty.id, actorId, reason || undefined);
      toast.success("Warranty cancelled");
      setReason("");
      onCancelled();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel this warranty?</DialogTitle>
          <DialogDescription>
            This sets the warranty status to <strong>cancelled</strong>. Existing
            claims keep their state. The action is logged.
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-4">
          <TextField
            label="Reason (optional)"
            value={reason}
            onChange={setReason}
            multiline={3}
            placeholder="Why is this being cancelled?"
          />
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} disabled={submitting}>
            Keep warranty
          </Button>
          <Button
            variant="primary"
            tone="critical"
            onClick={() => void confirm()}
            loading={submitting}
          >
            Cancel warranty
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PriceRow({
  label,
  value,
  strong,
  critical,
}: {
  label: string;
  value: string;
  strong?: boolean;
  critical?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        strong && "mt-1 border-t border-(--border-secondary) pt-2",
      )}
    >
      <dt className="body-md text-(--text-secondary)">{label}</dt>
      <dd
        className={cn(
          "body-md-numeric",
          strong && "font-semibold",
          critical && "text-(--text-critical)",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Explains why an action is disabled, on hover and focus. */
function MaybeTooltip({
  reason,
  children,
}: {
  reason?: string;
  children: ReactNode;
}) {
  return reason ? <Tooltip content={reason}>{children}</Tooltip> : <>{children}</>;
}
