"use client";

import { useMemo } from "react";
import { Banner } from "@/components/polaris";
import type { Warranty } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface PendingPurchaseBannerProps {
  warranties: Warranty[];
}

// Plain helper (not a hook) so the time read stays out of render — mirrors the
// date helpers in warranty-table.tsx.
function summarisePending(warranties: Warranty[]): {
  count: number;
  totalOwed: number;
  overdue: number;
} {
  const pending = warranties.filter((w) => w.purchaseStatus === "pending");
  const totalOwed = pending.reduce((sum, w) => sum + (w.costToDealership ?? 0), 0);
  const now = Date.now();
  const overdueCutoff = 60 * 86_400_000;
  const overdue = pending.filter(
    (w) => now - new Date(w.createdAt).getTime() > overdueCutoff,
  ).length;
  return { count: pending.length, totalOwed, overdue };
}

/**
 * Shown above the External warranties table when any rows are still in
 * `purchase_status = 'pending'`. A warning Banner that surfaces the count,
 * the total owed to providers, and any pending longer than 60 days. Purely
 * informational — the view tabs below cover navigation.
 */
export function PendingPurchaseBanner({
  warranties,
}: PendingPurchaseBannerProps) {
  const summary = useMemo(() => summarisePending(warranties), [warranties]);

  if (summary.count === 0) return null;

  return (
    <Banner
      tone="warning"
      title={`${summary.count} ${summary.count === 1 ? "warranty" : "warranties"} pending purchase`}
    >
      {formatCurrency(summary.totalOwed)} owed to providers
      {summary.overdue > 0
        ? ` · ${summary.overdue} overdue 60+ days`
        : ""}
      . Buy each one from its provider, then mark it purchased.
    </Banner>
  );
}
