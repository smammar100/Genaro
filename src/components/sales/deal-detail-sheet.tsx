"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Car } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button, Card, TextField } from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";
import { DealStageBadge } from "@/components/sales/status-badges";
import { useAuth } from "@/contexts/auth-context";
import { dealNoteService } from "@/lib/services/deal-note-service";
import type { DealNote, SalesDeal, User, Vehicle } from "@/lib/types";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { vehicleDetailHref } from "@/lib/vehicle-nav";

interface Props {
  deal: SalesDeal | null;
  vehicle: Vehicle | null;
  agent: User | null;
  /** Company staff, for resolving note authors — reuse the caller's already-
   *  loaded list (GEN-70) rather than re-fetching every time the sheet opens. */
  users: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** One labelled row in the deal sheet; renders nothing when the value is empty. */
function Row({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="body-sm shrink-0 text-(--text-secondary)">{label}</dt>
      <dd className="body-md text-right">{value}</dd>
    </div>
  );
}

/**
 * Read-only summary of a pipeline deal, opened from the pipeline card's
 * customer name. Deals aren't a routed page, so this sheet is their detail
 * view — it links out to the vehicle and to invoice generation.
 */
export function DealDetailSheet({
  deal,
  vehicle,
  agent,
  users,
  open,
  onOpenChange,
}: Props) {
  const { user } = useAuth();
  const pathname = usePathname();
  const canInvoice =
    deal?.stage === "deposit_taken" || deal?.stage === "completed_sale";

  const [notes, setNotes] = useState<DealNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!deal || !open) return;
    void dealNoteService.getForDeal(deal.id).then(setNotes);
  }, [deal, open]);

  async function handleAddNote() {
    if (!user || !deal || !newNote.trim()) return;
    setSavingNote(true);
    try {
      // GEN-70: append the row `add` already returns instead of a second
      // round trip to re-fetch the whole list — the note now appears the
      // instant the write completes.
      const note = await dealNoteService.add({
        dealId: deal.id,
        userId: user.id,
        content: newNote.trim(),
      });
      setNotes((prev) => [...prev, note]);
      setNewNote("");
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto bg-(--bg-surface-secondary) sm:max-w-md"
      >
        {deal && (
          <>
            <SheetHeader className="border-b border-(--border) bg-(--bg-surface)">
              <SheetTitle className="heading-md flex flex-wrap items-center gap-2">
                {deal.customerName}
                <DealStageBadge stage={deal.stage} />
              </SheetTitle>
              <SheetDescription className="body-sm text-(--text-secondary)">
                Deal opened {formatDate(deal.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 p-4">
              <Card title="Vehicle">
                {vehicle ? (
                  <Link
                    href={vehicleDetailHref(vehicle.id, pathname)}
                    className="-m-1 flex items-center gap-2 rounded-(--radius-200) p-1 transition-colors hover:bg-(--bg-surface-hover)"
                  >
                    <RegPlate registration={vehicle.registration} size="sm" />
                    <span className="body-md">
                      {vehicle.make} {vehicle.model}
                    </span>
                  </Link>
                ) : (
                  <p className="body-md inline-flex items-center gap-1.5 text-(--text-secondary)">
                    <Car className="size-4" /> No vehicle linked
                  </p>
                )}
              </Card>

              <Card title="Customer">
                <dl className="flex flex-col gap-2">
                  <Row label="Name" value={deal.customerName} />
                  <Row label="Phone" value={deal.customerPhone} />
                  <Row label="Email" value={deal.customerEmail} />
                </dl>
              </Card>

              <Card title="Deal">
                <dl className="flex flex-col gap-2">
                  <Row
                    label="Offer price"
                    value={
                      deal.offerPrice != null
                        ? formatCurrency(deal.offerPrice)
                        : null
                    }
                  />
                  <Row
                    label="Agreed price"
                    value={
                      deal.agreedPrice != null
                        ? formatCurrency(deal.agreedPrice)
                        : null
                    }
                  />
                  <Row
                    label="Deposit"
                    value={
                      deal.depositAmount != null
                        ? `${formatCurrency(deal.depositAmount)}${
                            deal.depositDate
                              ? ` · ${formatDate(deal.depositDate)}`
                              : ""
                          }`
                        : null
                    }
                  />
                  <Row
                    label="Collection"
                    value={
                      deal.collectionDate ? formatDate(deal.collectionDate) : null
                    }
                  />
                  <Row
                    label="Completed"
                    value={
                      deal.completionDate ? formatDate(deal.completionDate) : null
                    }
                  />
                  <Row label="Selling agent" value={agent?.name ?? null} />
                </dl>
              </Card>

              {/* Notes — timestamped, attributed running log (GEN-74) */}
              <Card
                title="Notes"
                actions={
                  <span className="body-sm text-(--text-secondary)">
                    {notes.length} note{notes.length === 1 ? "" : "s"}
                  </span>
                }
              >
                <TextField
                  label="New note"
                  labelHidden
                  multiline={2}
                  value={newNote}
                  onChange={setNewNote}
                  placeholder="Add a note, e.g. offered £500 discount"
                />
                <div className="flex justify-end">
                  <Button
                    icon="PlusMinor"
                    onClick={() => void handleAddNote()}
                    loading={savingNote}
                    disabled={!newNote.trim()}
                  >
                    Add note
                  </Button>
                </div>
                {notes.length > 0 && (
                  <ul className="-mx-4 -mb-4 mt-2 flex flex-col">
                    {[...notes].reverse().map((n) => {
                      const author = users.find((u) => u.id === n.userId);
                      return (
                        <li
                          key={n.id}
                          className="border-t border-(--border-secondary) px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="body-sm-semibold">
                              {author?.name ?? "Unknown"}
                            </span>
                            <span className="body-sm text-(--text-secondary)">
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </div>
                          <p className="body-md mt-1 whitespace-pre-wrap">
                            {n.content}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              {canInvoice && (
                <Button
                  variant="primary"
                  fullWidth
                  icon="OrdersMinor"
                  url={
                    vehicle
                      ? `/sales/invoice-generation?vehicleId=${vehicle.id}`
                      : "/sales/invoice-generation"
                  }
                >
                  Generate invoice
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
