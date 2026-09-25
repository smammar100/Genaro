"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { warrantyService } from "@/lib/services/warranty-service";
import { claimService } from "@/lib/services/claim-service";

/** Nav items that carry a count. */
export const NAV_BADGE_HREFS: ReadonlySet<string> = new Set([
  "/warranties/in-house",
  "/warranties/external",
  "/warranties/claims",
]);

/** A count worth showing: blank for zero, so an empty list shows no badge. */
const count = (n: number) => (n > 0 ? String(n) : undefined);

/**
 * Live counts for the Warranties pages, keyed by nav href.
 *
 * External shows pending purchases while there are any, else the total;
 * Claims shows open claims while there are any, else the total.
 *
 * Fetched only while `enabled` — the counts sit on sub-items, which are only
 * rendered while their group is open, so every other page skips the round
 * trips. Every service method goes through the shared cache (src/lib/cache.ts),
 * so these share requests with the warranty pages themselves.
 */
export function useNavBadgeCounts(enabled: boolean): Record<string, string | undefined> {
  const { company } = useAuth();
  const [counts, setCounts] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (!enabled || !company) return;
    let cancelled = false;
    void Promise.all([
      warrantyService.getTotalCountByType(company.id),
      warrantyService.getPendingPurchaseCount(company.id),
      claimService.getOpenCount(company.id),
      claimService.getAll(company.id),
    ])
      .then(([totals, pending, openClaims, claims]) => {
        if (cancelled) return;
        setCounts({
          "/warranties/in-house": count(totals.inHouse),
          "/warranties/external": count(pending) ?? count(totals.external),
          "/warranties/claims": count(openClaims) ?? count(claims.length),
        });
      })
      // A badge is a hint, not data anyone depends on: no count beats an error.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, company]);

  return counts;
}
