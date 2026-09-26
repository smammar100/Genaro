"use client";

import { Button, Card } from "@/components/polaris";
import { cn, formatCurrency } from "@/lib/utils";

/** AutoTrader's valuations from the lookup, with a shortcut to list at retail. */
export function ValuationCard({
  mileage,
  retailValuation,
  tradeValuation,
  partExchangeValuation,
  onUseAsListingPrice,
}: {
  mileage: number;
  retailValuation: number;
  tradeValuation: number | null;
  partExchangeValuation: number | null;
  onUseAsListingPrice: () => void;
}) {
  return (
    <Card title="AutoTrader valuation">
      <p className="text-xs text-(--text-secondary)">
        Based on {mileage.toLocaleString()} mi
      </p>
      <dl className="flex flex-col gap-1">
        <ValuationRow label="Retail" value={retailValuation} highlight />
        <ValuationRow label="Trade" value={tradeValuation} />
        <ValuationRow label="Part-ex" value={partExchangeValuation} />
      </dl>
      <Button fullWidth onClick={onUseAsListingPrice}>
        Use as listing price
      </Button>
    </Card>
  );
}

function ValuationRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-2 rounded-(--radius-200) px-2 py-1",
        highlight && "bg-(--bg-surface-secondary)",
      )}
    >
      <dt className="text-sm text-(--text-secondary)">{label}</dt>
      <dd
        className={cn(
          "text-sm tabular-nums",
          highlight ? "font-semibold" : "font-medium",
        )}
      >
        {value != null ? formatCurrency(value) : "—"}
      </dd>
    </div>
  );
}
