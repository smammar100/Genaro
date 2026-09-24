"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { warrantyService } from "@/lib/services/warranty-service";
import { claimService } from "@/lib/services/claim-service";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiState {
  activeInHouse: number;
  activeExternal: number;
  pendingPurchase: number;
  openClaims: number;
  expiringSoon: number;
}

/**
 * Four-card metrics row shared across the three warranty views.
 * Plain metric cards; hints call out when action is needed.
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

  if (!state) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const totalActive = state.activeInHouse + state.activeExternal;
  const pendingAccent = state.pendingPurchase > 0;
  const claimsAccent = state.openClaims > 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Active warranties"
        value={totalActive}
        hint={`${state.activeInHouse} in-house · ${state.activeExternal} external`}
      />
      <KpiCard
        label="Pending purchase"
        value={state.pendingPurchase}
        hint={pendingAccent ? "Action needed" : "All up to date"}
      />
      <KpiCard
        label="Open claims"
        value={state.openClaims}
        hint={claimsAccent ? "Awaiting resolution" : "All resolved"}
      />
      <KpiCard
        label="Expiring soon"
        value={state.expiringSoon}
        hint="Active, ending within 30 days"
      />
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  hint?: string;
}

/** Plain Shopify-style metric card: muted label, bold value, small hint. */
function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <Card className="flex flex-col gap-1 rounded-xl p-4 shadow-[0_1px_0_rgba(0,0,0,.05)]">
      <div className="text-[13px] font-medium text-muted-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-4">
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
