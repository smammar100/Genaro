"use client";

import { useCallback, useEffect, useState } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { notify } from "@/lib/toast";
import {
  Badge,
  Banner,
  Card,
  DataTable,
  EmptyState,
  Page,
  Pagination,
  SkeletonBodyText,
  type BadgeTone,
} from "@/components/polaris";
import type { AdvertiserRecord } from "@/lib/types";

const PAGE_SIZE = 20;

interface AdvertiserPageResponse {
  advertisers: AdvertiserRecord[];
  page: number;
  pageSize: number;
  totalResults: number;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Live/active advertisers read as healthy; any other AutoTrader status stays neutral. */
function statusTone(status: string): BadgeTone | undefined {
  return /^(active|live|enabled)$/i.test(status.trim()) ? "success" : undefined;
}

/**
 * /admin/advertisers — AutoTrader Connect Advertisers (Enhanced Go-Live).
 *
 * Lists the dealers configured on our integration, mirrored locally in
 * `at_advertisers`. "Sync now" pages the AutoTrader Advertisers API and
 * upserts the mirror; the Updated column shows when a row was last refreshed
 * by an advertiser-update notification. Gated by `advertiser:read`; sync gated
 * by `advertiser:sync`.
 */
export default function AdvertisersPage() {
  const { can, isSuperUser, isLoading: permsLoading } = usePermissions();
  const canRead = isSuperUser || can("advertiser:read");
  const canSync = isSuperUser || can("advertiser:sync");

  const [data, setData] = useState<AdvertiserPageResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  // Load failures must render as an ERROR, not as "No advertisers yet" — a
  // toast is transient, and an empty-looking list after a 500 tells the user
  // there are no advertisers when the truth is the data never arrived (GEN-50).
  const [loadError, setLoadError] = useState<string | null>(null);

  // Imperative reload (used after a sync) — setState here is fine outside an
  // effect. The effect below mirrors this but defers setState into .then so it
  // doesn't fire synchronously inside the effect body.
  const load = useCallback(async (p: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/autotrader/advertisers?page=${p}&pageSize=${PAGE_SIZE}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as AdvertiserPageResponse);
    } catch (e) {
      notify.error(`Couldn't load advertisers: ${String(e)}`);
      setLoadError(String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    fetch(`/api/autotrader/advertisers?page=${page}&pageSize=${PAGE_SIZE}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as AdvertiserPageResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setLoadError(null);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        notify.error(`Couldn't load advertisers: ${String(e)}`);
        setLoadError(String(e));
        setData(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, page]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/autotrader/advertisers", {
        method: "POST",
      });
      const body = (await res.json().catch(() => null)) as
        | { synced?: number; error?: string; detail?: string; cfRayId?: string }
        | null;
      if (!res.ok) {
        const ray = body?.cfRayId ? ` (ref ${body.cfRayId})` : "";
        notify.error(
          `Sync failed: ${body?.detail ?? body?.error ?? res.status}${ray}`,
        );
        return;
      }
      notify.success(`Synced ${body?.synced ?? 0} advertiser(s).`);
      setPage(1);
      await load(1);
    } catch (e) {
      notify.error(`Sync failed: ${String(e)}`);
    } finally {
      setSyncing(false);
    }
  }, [load]);

  if (permsLoading) {
    return (
      <Page title="Advertisers">
        <p className="body-md text-(--text-secondary)">Loading session…</p>
      </Page>
    );
  }
  if (!canRead) {
    return (
      <Page title="Advertisers">
        <Banner tone="warning">
          You don&apos;t have access to AutoTrader advertisers.
        </Banner>
      </Page>
    );
  }

  const advertisers = data?.advertisers ?? [];
  const total = data?.totalResults ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = data?.page ?? page;

  return (
    // Padding comes from the layout's PageShell — pages don't add their own
    // (GEN-61).
    <Page
      title="Advertisers"
      subtitle="Dealers configured on our AutoTrader Connect integration. Sync pulls the latest list; updates arrive automatically via notifications."
      fullWidth
      primaryAction={
        canSync
          ? {
              content: syncing ? "Syncing…" : "Sync now",
              loading: syncing,
              onAction: () => void handleSync(),
            }
          : undefined
      }
    >
      {loading ? (
        <Card>
          <SkeletonBodyText lines={6} />
        </Card>
      ) : loadError ? (
        <Banner
          tone="critical"
          title="Couldn't load advertisers"
          action={{ content: "Retry", onAction: () => void load(page) }}
        >
          {loadError}
        </Banner>
      ) : advertisers.length === 0 ? (
        <EmptyState heading="No advertisers yet">
          {canSync ? "Run a sync to pull them from AutoTrader." : undefined}
        </EmptyState>
      ) : (
        <DataTable
          headings={[
            "Advertiser ID",
            "Name",
            "Status",
            "Postcode",
            "Synced",
            "Updated",
          ]}
          rows={advertisers.map((a) => [
            <span key="id" className="body-sm font-mono">
              {a.advertiserId}
            </span>,
            a.name ?? "—",
            a.status ? (
              <Badge key="status" tone={statusTone(a.status)}>
                {a.status}
              </Badge>
            ) : (
              "—"
            ),
            a.postcode ?? "—",
            <span key="synced" className="body-sm text-(--text-secondary)">
              {formatWhen(a.syncedAt)}
            </span>,
            <span key="updated" className="body-sm text-(--text-secondary)">
              {formatWhen(a.atUpdatedAt)}
            </span>,
          ])}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="body-md text-(--text-secondary)">
          {loadError
            ? "—"
            : `${total} advertiser${total === 1 ? "" : "s"} · page ${currentPage} of ${totalPages}`}
        </span>
        <Pagination
          hasPrevious={!loading && currentPage > 1}
          hasNext={!loading && currentPage < totalPages}
          onPrevious={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>
    </Page>
  );
}
