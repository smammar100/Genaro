"use client";

import type * as React from "react";
import { Button, Card, InlineError } from "@/components/polaris";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VAT_RATE } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Important } from "./fields";
import { costRowId, type ArrivalFormApi, type MoneyField } from "./schema";

/**
 * Purchase costs (sheet S–AH): each line's amount and the VAT actually paid
 * on it. `totalBuyingPrice` comes from ArrivalForm's live roll-up, the same
 * formula the saved record uses.
 */
export function PurchaseCostsCard({
  form,
  totalBuyingPrice,
}: {
  form: ArrivalFormApi;
  totalBuyingPrice: number;
}) {
  return (
    <Card title="Purchase costs">
      <p className="body-sm text-(--text-secondary)">
        Enter the VAT actually paid on each line. Leave it blank if none was
        paid; +20% fills the standard rate.
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-88 text-sm">
          <thead>
            <tr className="border-b border-(--border-secondary) text-left text-xs text-(--text-secondary)">
              <th className="py-1.5 pr-2 font-medium">Cost item</th>
              <th className="whitespace-nowrap py-1.5 pr-2 text-right font-medium">Amount £</th>
              <th className="whitespace-nowrap py-1.5 pr-2 text-right font-medium">VAT paid £</th>
            </tr>
          </thead>
          <tbody>
            <CostRow label={<>Buying price <Important /></>} name="buyingPrice" vatName="vatOnBuyingPrice" form={form} />
            <CostRow label="BCA buyer's fee" name="buyersFee" vatName="vatOnBuyersFee" form={form} />
            <CostRow label="BCA essential check / Assured" name="inspectionCharge" vatName="vatOnInspectionCharge" form={form} />
            <CostRow label="BCA EV / hybrid Assured" name="evAssuredCharge" vatName="vatOnEvAssuredCharge" form={form} />
            <CostRow label="Battery health report" name="batteryReportFee" vatName="vatOnBatteryReportFee" form={form} />
            <CostRow label="Late payment / storage" name="lateStorageFee" vatName="vatOnLateStorageFee" form={form} />
            <CostRow label="Collection" name="collectionFee" vatName="vatOnCollectionFee" form={form} />
            <CostRow label="Delivery / transport" name="deliveryFee" vatName="vatOnDeliveryFee" form={form} />
            <tr className="border-t border-(--border) bg-(--bg-surface-secondary)">
              <td className="py-2 pl-2 pr-2 font-semibold">Total buying price</td>
              <td colSpan={2} className="py-2 pr-2 text-right font-semibold tabular-nums">
                {formatCurrency(totalBuyingPrice)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="pt-4 text-xs text-(--text-secondary)">
                Not part of the total buying price on the master sheet:
              </td>
            </tr>
            <CostRow label="Other charges" name="otherCharges" form={form} />
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/**
 * One cost line: the amount, and — for the master sheet's S–AH lines — the
 * VAT actually paid on it. VAT is entered, not assumed: roughly half the
 * client's purchases carry none. "+20%" fills the standard rate in one click.
 */
function CostRow({
  label,
  name,
  vatName,
  form,
}: {
  label: React.ReactNode;
  name: MoneyField;
  vatName?: MoneyField;
  form: ArrivalFormApi;
}) {
  const fieldId = costRowId(name);
  const vatId = vatName ? costRowId(vatName) : undefined;
  const amount = Number(form.watch(name)) || 0;
  const error = form.formState.errors[name]?.message;
  const vatError = vatName ? form.formState.errors[vatName]?.message : undefined;
  return (
    <tr className="border-b border-(--border-secondary) align-top last:border-b-0">
      <td className="py-1.5 pr-2">
        <Label className="text-xs font-normal" htmlFor={fieldId}>
          {label}
        </Label>
        {error ?? vatError ? <InlineError message={error ?? vatError} /> : null}
      </td>
      <td className="py-1.5 pr-2 text-right">
        <Input
          id={fieldId}
          type="number"
          step="0.01"
          min={0}
          {...form.register(name)}
          className="ml-auto h-8 w-24 text-right tabular-nums"
        />
      </td>
      <td className="py-1.5 text-right">
        {vatName ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              id={vatId}
              type="number"
              step="0.01"
              min={0}
              aria-label={`VAT paid on ${typeof label === "string" ? label : name}`}
              {...form.register(vatName)}
              className="h-8 w-20 text-right tabular-nums"
            />
            <Button
              variant="tertiary"
              size="micro"
              disabled={amount <= 0}
              accessibilityLabel="Fill in 20% VAT"
              onClick={() =>
                form.setValue(
                  vatName,
                  String(Math.round(amount * VAT_RATE * 100) / 100),
                  { shouldDirty: true },
                )
              }
            >
              +20%
            </Button>
          </div>
        ) : (
          <span className="text-xs text-(--text-secondary)">—</span>
        )}
      </td>
    </tr>
  );
}
