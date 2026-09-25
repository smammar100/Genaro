"use client";

import { useEffect, useId, useState } from "react";
import type { DepositMethod, Invoice } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import {
  invoiceReceiptService,
  type InvoiceReceipt,
} from "@/lib/services/invoice-receipt-service";
import { computeBalance, type BalanceState } from "@/lib/invoice-balance";
import {
  Button,
  Labelled,
  Select,
  SkeletonBodyText,
  TextField,
} from "@/components/polaris";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useAutoFocus } from "@/hooks/use-auto-focus";

const METHODS: [DepositMethod, string][] = [
  ["bank_transfer", "Bank transfer"],
  ["cash", "Cash"],
  ["card", "Card"],
  ["cheque", "Cheque"],
  ["pdq", "PDQ"],
];

const METHOD_OPTIONS = METHODS.map(([value, label]) => ({ value, label }));

const methodLabel = (m: string | null): string =>
  METHODS.find(([v]) => v === m)?.[1] ?? "—";

interface Props {
  invoice: Invoice;
  /** Fired after a payment is recorded or removed, so the list can refresh. */
  onChanged?: () => void;
}

/**
 * Payments received against one invoice, with the running balance (GEN-73).
 *
 * The invoice only ever held a single deposit figure, so a second payment had
 * nowhere to go and the balance stayed at the full amount. Every payment is
 * now its own line; the deposit and finance terms still show, netted off
 * alongside them.
 */
export function InvoicePaymentsPanel({ invoice, onChanged }: Props) {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<InvoiceReceipt[] | null>(null);
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  // Desktop-only focus when the add-payment row opens — see useAutoFocus.
  const amountRef = useAutoFocus<HTMLInputElement>(adding);
  const [paidOn, setPaidOn] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [method, setMethod] = useState<DepositMethod>("bank_transfer");
  const [saving, setSaving] = useState(false);
  const baseId = useId();
  const amountId = `${baseId}-amount`;
  const dateId = `${baseId}-date`;
  const methodId = `${baseId}-method`;

  useEffect(() => {
    void invoiceReceiptService
      .getForInvoice(invoice.id)
      .then(setReceipts)
      .catch(() => setReceipts([]));
  }, [invoice.id]);

  const balance: BalanceState = computeBalance({
    grandTotal: invoice.grandTotalInclAddons ?? invoice.total,
    deposit: invoice.depositAmount,
    finance: invoice.financeAmount,
    receipts: receipts ?? [],
  });

  async function handleAdd() {
    if (!user) return;
    const n = Number(amount.replace(/[£,\s]/g, ""));
    if (!(n > 0)) {
      toast.error("Enter a payment amount");
      return;
    }
    setSaving(true);
    try {
      const { balance: next } = await invoiceReceiptService.record(
        { invoiceId: invoice.id, amount: n, paidOn, method },
        user.id,
      );
      setReceipts(await invoiceReceiptService.getForInvoice(invoice.id));
      setAmount("");
      setAdding(false);
      toast.success(
        next.settled
          ? "Paid in full, invoice marked Paid"
          : `Payment recorded, ${formatCurrency(next.balanceDue)} still due`,
      );
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't record payment");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(r: InvoiceReceipt) {
    if (!user) return;
    try {
      await invoiceReceiptService.remove(r.id, user.id);
      setReceipts(await invoiceReceiptService.getForInvoice(invoice.id));
      toast.success("Payment removed");
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove payment");
    }
  }

  if (receipts === null) return <SkeletonBodyText lines={3} />;

  const entries = [
    ...(invoice.depositAmount > 0
      ? [
          {
            key: "deposit",
            label: "Deposit",
            date: invoice.depositReceivedDate,
            method: invoice.depositMethod,
            amount: invoice.depositAmount,
            removable: false,
          },
        ]
      : []),
    ...(invoice.financeAmount > 0
      ? [
          {
            key: "finance",
            label: invoice.financeProvider ?? "Finance",
            date: null,
            method: null,
            amount: invoice.financeAmount,
            removable: false,
          },
        ]
      : []),
    ...receipts.map((r) => ({
      key: r.id,
      label: "Payment",
      date: r.paidOn,
      method: r.method,
      amount: r.amount,
      removable: true,
      receipt: r,
    })),
  ];

  return (
    <div className="rounded-(--radius-300) border border-(--border)">
      <div className="flex items-center gap-2 px-3 py-2">
        <Button
          variant="tertiary"
          disclosure={open ? "up" : "down"}
          ariaExpanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {`Payments · ${entries.length}`}
        </Button>
        <span
          className={cn(
            "ml-auto text-sm font-semibold tabular-nums",
            balance.settled ? "text-(--text-success)" : "text-(--text)",
          )}
        >
          {balance.settled
            ? "Paid in full"
            : `${formatCurrency(balance.balanceDue)} due`}
        </span>
      </div>

      {open ? (
        <div className="border-t border-(--border)">
          {entries.length === 0 ? (
            <p className="px-3 py-2 text-xs text-(--text-secondary)">
              Nothing received yet.
            </p>
          ) : (
            <ul className="divide-y divide-(--border-secondary)">
              {entries.map((e) => (
                <li
                  key={e.key}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs"
                >
                  <span className="font-medium">{e.label}</span>
                  <span className="text-(--text-secondary)">
                    {e.date ? formatDate(e.date) : "—"}
                  </span>
                  <span className="text-(--text-secondary)">
                    · {methodLabel(e.method)}
                  </span>
                  <span className="ml-auto tabular-nums">
                    {formatCurrency(e.amount)}
                  </span>
                  {e.removable && "receipt" in e ? (
                    <Button
                      variant="tertiary"
                      tone="critical"
                      size="micro"
                      icon="DeleteMinor"
                      accessibilityLabel="Remove payment"
                      onClick={() => void handleRemove(e.receipt as InvoiceReceipt)}
                    />
                  ) : (
                    <span className="size-6" />
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-(--border) bg-(--bg-surface-secondary) px-3 py-2 text-xs">
            <span className="text-(--text-secondary)">
              Total {formatCurrency(balance.grandTotal)} · paid{" "}
              {formatCurrency(balance.paid)}
            </span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                balance.overpaid && "text-(--text-warning)",
              )}
            >
              {balance.overpaid
                ? `Overpaid by ${formatCurrency(balance.overpaidBy)}`
                : `Balance ${formatCurrency(balance.balanceDue)}`}
            </span>
          </div>

          {adding ? (
            // A real form so Enter records the payment from any field.
            // Escape cancels just this row: the dialog also closes on Escape
            // via a document listener, so stop the event before it gets there.
            <form
              className="flex flex-wrap items-end gap-2 border-t border-(--border) px-3 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleAdd();
              }}
              onKeyDown={(e) => {
                if (e.key !== "Escape") return;
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                setAdding(false);
              }}
            >
              <div
                className="w-32"
                // TextField doesn't forward a ref, so hand its <input> to the
                // auto-focus hook (desktop-only focus when the row opens).
                ref={(el) => {
                  amountRef.current = el?.querySelector("input") ?? null;
                }}
              >
                <TextField
                  id={amountId}
                  label="Amount"
                  prefix="£"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={setAmount}
                />
              </div>
              <div className="w-36">
                <Labelled id={dateId} label="Date">
                  <Input
                    id={dateId}
                    type="date"
                    value={paidOn}
                    onChange={(e) => setPaidOn(e.target.value)}
                  />
                </Labelled>
              </div>
              <div className="w-36">
                <Select
                  id={methodId}
                  label="Method"
                  options={METHOD_OPTIONS}
                  value={method}
                  onChange={(v) => setMethod(v as DepositMethod)}
                />
              </div>
              <Button submit loading={saving}>
                Record payment
              </Button>
              <Button
                variant="tertiary"
                disabled={saving}
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
            </form>
          ) : balance.settled ? null : (
            <div className="border-t border-(--border) px-3 py-2">
              <Button
                variant="plain"
                icon="PlusMinor"
                onClick={() => {
                  // Pre-fill with what's outstanding — settling in full is the
                  // common case, and typing it again invites a typo.
                  setAmount(String(balance.balanceDue));
                  setAdding(true);
                }}
              >
                Record a payment
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
