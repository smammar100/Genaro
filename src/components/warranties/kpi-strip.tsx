"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { warrantyService } from "@/lib/services/warranty-service";
import { claimService } from "@/lib/services/claim-service";
import { Card, SkeletonBodyText, SkeletonDisplayText } from "@/components/polaris";

interface KpiState {
  activeInHouse: number;
  activeExternal: number;
  pendingPurchase: number;
  openClaims: number;
  expiringSoon: number;
}

/**
 * Four-tile summary shared across the three warranty views — the Polaris
 * stat-tiles pattern: one flush card, tiles split by hairlines, 2 × 2 on
 * narrow screens. Hints call out when action is needed.
 */
export function KpiStrip({ refreshKey = 0 }: { refreshKey?: number }) {
  const { company } = useAuth();
  const [state, setState] = useState<KpiState | null>(null);

  useEffect(() => {
    if (!company) return;
    let cancel = false;
    void Promise.all([
      warrantyService.getActiveCount(company.id),
      warrantyService.getPendingPurchaseCount(company.id),
      claimService.getOpenCount(company.id),
      warrantyService.getExpiringSoon(company.id, 30),
    ]).then(([active, pending, openClaims, expiring]) => {
      if (cancel) return;
      setState({
        activeInHouse: active.inHouse,
        activeExternal: active.external,
        pendingPurchase: pending,
        openClaims,
        expiringSoon: expiring.length,
      });
    });
    return () => {
      cancel = true;
    };
  }, [company, refreshKey]);

  const tiles: KpiTileProps[] | null = state
    ? [
        {
          label: "Active warranties",
          value: state.activeInHouse + state.activeExternal,
          hint: `${state.activeInHouse} in-house · ${state.activeExternal} external`,
        },
        {
          label: "Pending purchase",
          value: state.pendingPurchase,
          hint: state.pendingPurchase > 0 ? "Action needed" : "All up to date",
          attention: state.pendingPurchase > 0,
        },
        {
          label: "Open claims",
          value: state.openClaims,
          hint: state.openClaims > 0 ? "Awaiting resolution" : "All resolved",
          attention: state.openClaims > 0,
        },
        {
          label: "Expiring soon",
          value: state.expiringSoon,
          hint: "Active, ending within 30 days",
        },
      ]
    : null;

  return (
    <Card padding="0">
      <div className="grid grid-cols-2 lg:grid-cols-4 [&>*]:border-(--border-secondary) [&>*:nth-child(even)]:border-l [&>*:nth-child(n+3)]:border-t lg:[&>*:nth-child(n+2)]:border-l lg:[&>*:nth-child(n+3)]:border-t-0">
        {tiles
          ? tiles.map((t) => <KpiTile key={t.label} {...t} />)
          : Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 p-4">
                <SkeletonBodyText lines={1} />
                <SkeletonDisplayText size="small" />
              </div>
            ))}
      </div>
    </Card>
  );
}

interface KpiTileProps {
  label: string;
  value: number;
  hint?: string;
  /** Tints the hint when the number needs acting on. */
  attention?: boolean;
}

/** One metric: secondary label, heading-sized value, small hint. */
function KpiTile({ label, value, hint, attention }: KpiTileProps) {
  return (
    <div className="flex flex-col gap-1 p-4">
      <div className="body-sm text-(--text-secondary)">{label}</div>
      <div className="heading-lg tabular-nums text-(--text)">{value}</div>
      {hint && (
        <div
          className={
            attention
              ? "body-sm text-(--text-caution)"
              : "body-sm text-(--text-secondary)"
          }
        >
          {hint}
        </div>
      )}
    </div>
  );
}
