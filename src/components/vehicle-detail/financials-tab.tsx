"use client";

import { useEffect, useState } from "react";
import { ChevronRight, DollarSign } from "lucide-react";
import type { Invoice, Listing, Vehicle } from "@/lib/types";
import { listingService } from "@/lib/services/listing-service";
import { invoiceService } from "@/lib/services/invoice-service";
import { paidAddonsTotal } from "@/lib/invoice-calc";
import { Button, Card } from "@/components/polaris";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Field, FieldGrid, Panel, Pill } from "./primitives";
import { EditableCard, type EditableField } from "./editable-card";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { vehicleService } from "@/lib/services/vehicle-service";
import { toast } from "@/lib/toast";
import { describeChanges, nonNegative, type FieldChange } from "@/lib/field-edit";
import { computeCostTotals, withDerivedCosts } from "@/lib/vehicle-costs";
import {
  expenseAtPointOfSale,
  isValueAdditionLocked,
} from "@/lib/master-sheet";
import { ExternalInvoicesSection } from "./external-invoices-section";

interface FinancialsTabProps {
  vehicle: Vehicle;
  /** Re-pull the vehicle so edited costs propagate to every other surface. */
  onChanged?: () => void;
}

/**
 * Every cost line, in the order the expense ledger shows them: the master
 * sheet's S–AH first (each fee followed by the VAT paid on it — together they
 * are TOTAL BUYING PRICE), then the app-only costs below it. Labels follow the
 * sheet (docs/master-sheet-spec.md).
 */
const COST_LINES: { key: keyof Vehicle & string; label: string }[] = [
  { key: "buyingPrice", label: "Buying price" },
  { key: "vatOnBuyingPrice", label: "VAT on buying price" },
  { key: "buyersFee", label: "BCA buyer's fee" },
  { key: "vatOnBuyersFee", label: "VAT on buyer's fee" },
  { key: "inspectionCharge", label: "BCA Essential Check / Assured" },
  { key: "vatOnInspectionCharge", label: "VAT on Essential Check" },
  { key: "evAssuredCharge", label: "BCA EV / Hybrid Assured" },
  { key: "vatOnEvAssuredCharge", label: "VAT on EV / Hybrid Assured" },
  { key: "batteryReportFee", label: "Battery health report" },
  { key: "vatOnBatteryReportFee", label: "VAT on battery report" },
  { key: "lateStorageFee", label: "Late payment / storage" },
  { key: "vatOnLateStorageFee", label: "VAT on late payment / storage" },
  { key: "collectionFee", label: "Collection" },
  { key: "vatOnCollectionFee", label: "VAT on collection" },
  { key: "deliveryFee", label: "Delivery / transport" },
  { key: "vatOnDeliveryFee", label: "VAT on delivery" },
  { key: "otherCharges", label: "Other charges" },
  { key: "loadingFee", label: "Loading fee" },
  { key: "unloadingFee", label: "Unloading fee" },
  { key: "stockingCharges", label: "Stocking charges" },
  { key: "valueAddition", label: "Total value addition" },
  { key: "warrantyCost", label: "Warranty cost" },
];

function costFields(vehicle: Vehicle): EditableField<Vehicle>[] {
  const valueAdditionLocked = isValueAdditionLocked(vehicle);
  return COST_LINES.map((f) => ({
    key: f.key,
    label: f.label,
    kind: "currency" as const,
    // Money is never negative here — a refund belongs in its own line, not as
    // a negative cost that silently reduces the car's base cost.
    validators: [nonNegative(f.label) as never],
    // TOTAL VALUE ADDITION is the Things to Do roll-up on a car added in the
    // app; typing over it would be undone by the next to-do edit. A legacy
    // car's figure is the imported one and stays editable.
    readOnly: f.key === "valueAddition" && !valueAdditionLocked,
    hint:
      f.key === "valueAddition" && !valueAdditionLocked
        ? "Sum of the Things to Do costs."
        : undefined,
    render: (v: Vehicle) =>
      formatCurrency((v[f.key] as number | null) ?? 0),
  }));
}

/** Master sheet BH–BN — expenses at the point of sale (BO is their sum). */
const POINT_OF_SALE_FIELDS: EditableField<Vehicle>[] = [
  { key: "financeCompanyCharges", label: "Finance company charges / commission" },
  { key: "partnerShare", label: "Partner's share" },
  { key: "extendedWarrantyCost", label: "Extended warranty" },
  { key: "roadTaxCost", label: "Road tax" },
  { key: "insuranceCost", label: "Insurance" },
  { key: "otherJobsCost", label: "Other jobs" },
  { key: "customerDeliveryCost", label: "Delivery to customer" },
].map((f) => ({
  key: f.key as keyof Vehicle & string,
  label: f.label,
  kind: "currency" as const,
  validators: [nonNegative(f.label) as never],
  render: (v: Vehicle) =>
    formatCurrency((v[f.key as keyof Vehicle] as number | null) ?? 0),
}));

interface LedgerEntry {
  name: string;
  amount: number;
}

/**
 * Financials tab — Variation B ("money-in vs money-out"). The full cost
 * ledger and the full revenue ledger sit side-by-side and meet at a
 * centred "= Net profit" result, followed by the AutoTrader market
 * position, purchase information, external invoices, and the HMRC
 * margin-scheme breakdown. HMRC margin-scheme aware throughout.
 */
export function FinancialsTab({ vehicle, onChanged }: FinancialsTabProps) {
  // Web price source aligned with the Overview tab: prefer the live listing
  // price, fall back to the vehicle record so both surfaces show the same
  // revenue for the same car.
  const [listing, setListing] = useState<Listing | null>(null);
  useEffect(() => {
    let active = true;
    void listingService
      .getForVehicle(vehicle.id)
      .then((l) => active && setListing(l))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [vehicle.id]);

  // The vehicle's real add-on revenue lives on its sale invoice. Fetch it so the
  // revenue ledger and the SIV figure reflect actual paid add-ons rather than 0.
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  useEffect(() => {
    let active = true;
    void invoiceService
      .getByVehicle(vehicle.companyId, vehicle.id, "sale")
      .then((rows) => active && setInvoice(rows[0] ?? null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [vehicle.companyId, vehicle.id]);

  const { user } = useAuth();
  const { can, isSuperUser } = usePermissions();
  const canEditCosts = isSuperUser || can("inventory:edit_costs");

  /**
   * Save a cost edit and re-derive the stored totals in the same write.
   *
   * `totalBuyingPrice`, `landedCost`, `baseCost` and `grossEarning` are stored
   * columns that All Vehicles, the Master Sheet and the reports read directly.
   * Writing a cost field without them would leave "Total cost" and "Profit"
   * quoting figures that no longer match this ledger.
   */
  const saveCosts = async (
    patch: Partial<Vehicle>,
    changes: FieldChange[],
  ): Promise<void> => {
    if (!user?.id) {
      toast.error("You must be signed in to edit financials.");
      throw new Error("no actor");
    }
    const withDerived = withDerivedCosts(vehicle, patch);

    try {
      await vehicleService.update(vehicle.id, withDerived, user.id, {
        description: `${vehicle.registration} — ${describeChanges(changes)}`,
        changes,
      });
      toast.success("Financials updated");
      onChanged?.();
    } catch (err) {
      toast.error("Could not save financials. Please try again.");
      throw err;
    }
  };

  const retail = listing?.price ?? vehicle.listingPrice ?? 0;

  // Same figure the stored baseCost holds — one formula, vehicle-costs.ts.
  const expenseTotal = computeCostTotals(vehicle).baseCost;
  const pointOfSaleTotal = expenseAtPointOfSale(vehicle);

  // Add-on revenue lines (markups / commissions / fees) come from the vehicle's
  // sale invoice. When an invoice exists we list its real paid add-on lines; the
  // total is the canonical paidAddonsTotal so the SIV figure stays consistent.
  // With no invoice yet we fall back to the capture taxonomy shown at 0.
  const paidAddonLines = (invoice?.lineItems ?? []).filter(
    (l) => l.type === "addon_paid",
  );
  const addons: LedgerEntry[] =
    paidAddonLines.length > 0
      ? paidAddonLines.map((l) => ({
          name: l.description || "Add-on",
          amount: l.total,
        }))
      : [
          "Accessories", "Warranty (markup)", "Paint protection", "Admin fee",
          "GAP insurance", "Service plan", "Smart insurance", "Finance commission",
          "Bonus", "Discount", "Writedown", "Commission adj.",
        ].map((name) => ({ name, amount: 0 }));
  // Canonical paid add-on revenue from the invoice (falls back to 0 gracefully).
  const addonTotal = invoice
    ? paidAddonsTotal(invoice.lineItems)
    : 0;

  const revenue: LedgerEntry[] = [
    { name: "Retail (web price)", amount: retail },
    ...addons,
  ];
  const revenueTotal = retail + addonTotal;

  // Both halves of the screen must agree: net = money in − money out, using the
  // SAME full-cost figure the expense ledger displays (which already includes
  // stocking charges, prep/value-addition and warranty cost — the canonical
  // baseCost that matches the Master Sheet). Gross is the pre-VAT margin.
  const gross = revenueTotal > 0 ? Math.max(0, revenueTotal - expenseTotal) : 0;
  const marginVat = gross * (0.2 / 1.2);
  const net = gross - marginVat;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-1.5 body-sm text-(--text-secondary)">
        <DollarSign className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Every cost and every add-on revenue for this car. VAT uses
          HMRC&apos;s{" "}
          <strong className="body-sm-semibold text-(--text)">Margin Scheme</strong>:
          owed only on the profit margin, not the full sale price.
        </p>
      </div>

      {/* Money out vs money in */}
      <div className="grid items-stretch gap-4 @4xl:grid-cols-[1fr_auto_1fr]">
        {/* GEN-88: the expense ledger is the editable surface — every line here
            is a stored vehicle cost, and correcting one re-derives the totals
            the rest of the app reads. */}
        <div className="flex flex-col gap-2">
          <EditableCard
            title="Money out · expenses"
            record={vehicle}
            fields={costFields(vehicle)}
            onSave={saveCosts}
            canEdit={canEditCosts}
            className="[&_[data-testid]]:contents"
          />
          <div className="flex items-center justify-between rounded-(--radius-300) bg-(--bg-surface-secondary) px-4 py-2.5 shadow-(--shadow-100)">
            <span className="body-md text-(--text-secondary)">
              Total expenses
            </span>
            <span className="text-base font-semibold tabular-nums">
              {formatCurrency(expenseTotal)}
            </span>
          </div>
        </div>
        <div className="hidden items-center justify-center @4xl:flex">
          <span className="grid size-12 place-items-center rounded-full bg-(--bg-surface) text-(--icon-secondary) shadow-(--shadow-100)">
            <ChevronRight className="size-5" />
          </span>
        </div>
        <LedgerCard
          title="Money in · revenue"
          subtitle={`Retail ${formatCurrency(retail)} + add-ons`}
          rows={revenue}
          total={revenueTotal}
          tone="good"
        />
      </div>

      {/* Net result */}
      <Card background="subdued" className="items-center gap-1 p-5 text-center">
        <div className="body-md text-(--text-secondary)">
          Net profit after margin VAT
        </div>
        <div className="text-3xl font-semibold tabular-nums text-(--text-success)">
          {net > 0 ? formatCurrency(Math.round(net)) : "—"}
        </div>
        <div className="body-sm text-(--text-secondary)">
          Gross {formatCurrency(gross)} − margin VAT {formatCurrency(marginVat)}
        </div>
      </Card>

      {/* Master sheet BH–BN. Not part of the base cost — the sheet keeps
          them as a separate "expense at point of sale" (BO). */}
      <div className="flex flex-col gap-2">
        <EditableCard
          title="Expenses at point of sale"
          record={vehicle}
          fields={POINT_OF_SALE_FIELDS}
          onSave={saveCosts}
          canEdit={canEditCosts}
        />
        <div className="flex items-center justify-between rounded-(--radius-300) bg-(--bg-surface-secondary) px-4 py-2.5 shadow-(--shadow-100)">
          <span className="body-md text-(--text-secondary)">
            Expense at point of sale
          </span>
          <span className="text-base font-semibold tabular-nums">
            {formatCurrency(pointOfSaleTotal)}
          </span>
        </div>
      </div>

      {/* AutoTrader market value */}
      {vehicle.atRetailValuation != null && (
        <AutoTraderCard vehicle={vehicle} retail={retail} />
      )}

      {/* Purchase information */}
      <Panel
        title="Purchase information"
        subtitle={
          vehicle.invoiceDate
            ? `Invoice · ${formatDate(vehicle.invoiceDate)}`
            : "Invoice not recorded"
        }
        action={
          <Button variant="plain" icon="PrintMajor">
            Print invoice
          </Button>
        }
      >
        <FieldGrid cols={3}>
          <Field label="Supplier">{vehicle.sellerName}</Field>
          <Field label="VAT scheme">Margin based</Field>
          <Field label="Purchase source">
            <span className="capitalize">
              {vehicle.purchaseSource.replace("_", " ")}
            </span>
          </Field>
          <Field label="Buying price" numeric>
            {formatCurrency(vehicle.buyingPrice)}
          </Field>
          <Field label="Total buying" numeric>
            {formatCurrency(vehicle.totalBuyingPrice)}
          </Field>
          <Field label="Stocking provider">
            <span className="capitalize">
              {vehicle.financeProvider.replace("_", " ")}
            </span>
          </Field>
        </FieldGrid>
      </Panel>

      {/* External invoices (Module D) — live data + add dialogs */}
      <ExternalInvoicesSection vehicleId={vehicle.id} />

      {/* VAT margin scheme */}
      <Panel
        title="VAT margin scheme"
        subtitle="Under HMRC margin scheme, VAT applies only to gross profit"
        action={<Pill tone="info">Margin scheme</Pill>}
      >
        <FieldGrid cols={4}>
          <VatStat label="Gross profit" value={gross} formula="revenue − total cost" tone="good" />
          <VatStat label="Margin VAT" value={marginVat} formula="gross × 0.20 / 1.20" />
          <VatStat label="Car margin" value={net} formula="gross − VAT" tone="good" />
          <VatStat label="Net profit (SIV)" value={net + addonTotal} formula="+ add-on profit" tone="good" />
        </FieldGrid>
      </Panel>
    </div>
  );
}

function LedgerCard({
  title,
  subtitle,
  rows,
  total,
  tone,
}: {
  title: string;
  subtitle: string;
  rows: LedgerEntry[];
  total: number;
  tone: "bad" | "good";
}) {
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      action={<Pill tone={tone}>{formatCurrency(total)}</Pill>}
      flush
    >
      <div className="divide-y divide-(--border-secondary) border-t border-(--border-secondary)">
        {rows.map((r) => {
          const has = r.amount > 0;
          return (
            <div
              key={r.name}
              className="flex items-center justify-between gap-3 px-4 py-2.5 body-md"
            >
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    has ? "bg-(--bg-fill-brand)" : "bg-(--bg-fill-disabled)",
                  )}
                />
                <span className={cn(has ? "text-(--text)" : "text-(--text-secondary)")}>
                  {r.name}
                </span>
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  has ? "body-md-semibold" : "text-(--text-secondary)",
                )}
              >
                {formatCurrency(r.amount)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-(--border-secondary) bg-(--bg-surface-secondary) px-4 py-3">
        <span className="body-md text-(--text-secondary)">
          {tone === "bad" ? "Total expenses" : "Total revenue"}
        </span>
        <span className="text-base font-semibold tabular-nums">
          {formatCurrency(total)}
        </span>
      </div>
    </Panel>
  );
}

function AutoTraderCard({
  vehicle,
  retail,
}: {
  vehicle: Vehicle;
  retail: number;
}) {
  const atRetail = vehicle.atRetailValuation ?? 0;
  const atTrade = vehicle.atTradeValuation ?? 0;
  const ratio = retail > 0 && atRetail > 0 ? retail / atRetail : null;
  const showBar = retail > 0 && atRetail > atTrade;
  const pos = showBar
    ? Math.max(0, Math.min(1, (retail - atTrade) / (atRetail - atTrade))) * 100
    : 0;

  return (
    <Panel
      title="AutoTrader market value"
      subtitle={`${retail > 0 ? `Your price ${formatCurrency(retail)} · ` : ""}${
        vehicle.atValuationAt
          ? `valued ${formatDate(vehicle.atValuationAt)}`
          : "captured at intake"
      } · ${vehicle.mileage.toLocaleString()} mi`}
      action={
        ratio != null ? (
          <Pill tone={ratio <= 0.97 ? "good" : ratio <= 1.03 ? "info" : "warn"}>
            {ratio <= 0.97
              ? "Priced to sell"
              : ratio <= 1.03
                ? "At market"
                : "Above market"}
          </Pill>
        ) : null
      }
    >
      {showBar && (
        <div className="relative mb-3 mt-1 h-2 rounded-full bg-(--bg-fill-tertiary)">
          <div
            className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-(--bg-surface) bg-(--bg-fill-brand) shadow-(--shadow-100)"
            style={{ left: `${pos}%` }}
          />
        </div>
      )}
      <FieldGrid cols={4}>
        <Field label="Retail" numeric>
          {formatCurrency(vehicle.atRetailValuation)}
        </Field>
        <Field label="Trade" numeric>
          {vehicle.atTradeValuation != null
            ? formatCurrency(vehicle.atTradeValuation)
            : "—"}
        </Field>
        <Field label="Part-exchange" numeric>
          {vehicle.atPartExchangeValuation != null
            ? formatCurrency(vehicle.atPartExchangeValuation)
            : "—"}
        </Field>
        <Field label="Private" numeric>
          {vehicle.atPrivateValuation != null
            ? formatCurrency(vehicle.atPrivateValuation)
            : "—"}
        </Field>
      </FieldGrid>
    </Panel>
  );
}

function VatStat({
  label,
  value,
  formula,
  tone,
}: {
  label: string;
  value: number;
  formula?: string;
  tone?: "good";
}) {
  return (
    <div>
      <div className="body-md text-(--text-secondary)">{label}</div>
      <div
        className={cn(
          "mt-1 text-base font-semibold tabular-nums",
          tone === "good" && "text-(--text-success)",
        )}
      >
        {value > 0 ? formatCurrency(value) : "—"}
      </div>
      {formula && (
        <div className="mt-1 body-sm text-(--text-secondary)">{formula}</div>
      )}

    </div>
  );
}
