"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { invalidate } from "@/lib/cache";

/**
 * Subscribe to postgres_changes on a Supabase table for a given company and
 * fire `onChange` for every insert/update/delete that lands.
 *
 * Pairs with the shared cache (`src/lib/cache.ts`): when an event arrives we
 * invalidate the namespace so the next read fetches fresh data, then call
 * the consumer-supplied callback (typically a refetch or router.refresh).
 *
 * Realtime must be enabled for the table in Supabase:
 *   Database → Replication → supabase_realtime publication.
 * The Phase 1 migration handles `warranties` and `warranty_claims`.
 */
export function useRealtimeTable(opts: {
  table: string;
  companyId: string | null | undefined;
  /** Cache prefix to invalidate on each event (e.g. "warranties:"). */
  invalidatePrefix?: string;
  /** Called after the cache is invalidated. Use for refetches / refresh. */
  onChange?: () => void;
  /**
   * Column to scope the realtime filter on. Defaults to "company_id" so
   * existing callers are unaffected; tables keyed by user_id (etc.) can
   * subscribe correctly by passing this. The value matched is always
   * `companyId`.
   */
  filterColumn?: string;
}) {
  const { table, companyId, invalidatePrefix, onChange, filterColumn } = opts;

  // Hold onChange in a ref (updated after each render via an effect, so the
  // write doesn't happen during render) so inline closures from callers don't
  // churn the subscription. The subscription effect deps stay stable.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const column = filterColumn ?? "company_id";

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let subscribedOnce = false;
    // Each subscription gets its own number. Removing a channel makes it
    // report CLOSED too, and that must not look like a drop: only the
    // current channel's statuses count. The number also goes in the topic,
    // because Supabase hands back a still-closing channel of the same name.
    let generation = 0;

    const handleEvent = () => {
      if (invalidatePrefix) invalidate(invalidatePrefix);
      onChangeRef.current?.();
    };

    const resubscribe = () => {
      if (disposed) return;
      const old = channel;
      subscribe();
      if (old) void supabase.removeChannel(old);
    };

    const subscribe = () => {
      if (disposed) return;
      const mine = ++generation;
      channel = supabase
        .channel(`realtime-${table}-${companyId}-${mine}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `${column}=eq.${companyId}`,
          },
          handleEvent,
        )
        .subscribe((status) => {
          if (disposed || mine !== generation) return;
          // Changes made while the channel was down are not replayed, so a
          // reconnect (tab back in focus, network back) refetches once to
          // pick up anything that landed in the gap.
          if (status === "SUBSCRIBED") {
            if (subscribedOnce) handleEvent();
            subscribedOnce = true;
            return;
          }
          // The realtime socket drops on idle timeout / network blips with
          // no built-in recovery — that's why live data went stale until a
          // hard reload. Tear down and re-subscribe on a short backoff so
          // updates resume on their own.
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(resubscribe, 2000);
          }
        });
    };

    subscribe();

    // Reconnect immediately when the tab/network returns rather than
    // waiting for the next error tick (debounced so a focus burst doesn't
    // stack channels).
    const onWake = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      )
        return;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(resubscribe, 500);
    };
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [table, companyId, invalidatePrefix, column]);
}
