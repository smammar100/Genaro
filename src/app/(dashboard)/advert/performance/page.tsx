"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Trophy, TriangleAlert } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { listingService } from "@/lib/services/listing-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import {
  performanceService,
  type PerformanceStats,
} from "@/lib/services/performance-service";
import type { Listing, ListingChannel, Vehicle } from "@/lib/types";
import {
  Badge,
  Card,
  EmptyState,
  Page,
  ProgressBar,
} from "@/components/polaris";
import { Skeleton } from "@/components/ui/skeleton";
import { RegPlate } from "@/components/shared/reg-plate";
import { AtIndicatorCell } from "@/components/data-grid";
import { formatCurrency } from "@/lib/utils";

const STALE_DAYS = 75; // days in stock past which a live advert needs attention

// Each scorecard is labelled, so the share bars share one neutral fill rather
// than a colour per channel.
const CHANNELS: { key: ListingChannel; label: string }[] = [
  { key: "website", label: "Website" },
  { key: "autotrader", label: "AutoTrader" },
  { key: "ebay", label: "eBay" },
  { key: "facebook", label: "Facebook" },
];

interface LiveRow extends Listing {
  vehicle: Vehicle | null;
  enq: number; // total enquiries for this advert's vehicle (from leads)
}

/* --------------------------------------------------------------- primitives */

/** One metric in the KPI strip: label, value and a short qualifier. */
function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 bg-(--bg-surface) p-4">
      <span className="body-sm text-(--text-secondary)">{label}</span>
      <span className="heading-lg tabular-nums">{value}</span>
      {sub ? (
        <span className="body-sm text-(--text-secondary)">{sub}</span>
      ) : null}
    </div>
  );
}

/** A channel's enquiry share, 0–100, as a labelled bar. */
function ShareOfEnquiries({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="body-sm mb-1 flex justify-between text-(--text-secondary)">
        <span>Share of enquiries</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <ProgressBar
        progress={pct}
        size="small"
        tone="primary"
        accessibilityLabel={`${label} share of enquiries`}
      />
    </div>
  );
}

/** Dependency-free area chart for the leads-over-time trend. */
function AreaChart({ data, h = 180 }: { data: number[]; h?: number }) {
  const w = 600;
  const max = Math.max(...data, 1);
  const pad = 6;
  const pt = (v: number, i: number): [number, number] => [
    (i / Math.max(data.length - 1, 1)) * w,
    h - pad - (v / max) * (h - pad * 2),
  ];
  const line = data.map((v, i) => pt(v, i).join(",")).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full text-primary"
      style={{ height: h }}
    >
      <defs>
        <linearGradient id="perfArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#perfArea)" />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------- page */

export default function PerformancePage() {
  const { company } = useAuth();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);

  useEffect(() => {
    if (!company) return;
    void Promise.all([
      listingService.getAll(company.id),
      vehicleService.getAll(company.id),
      performanceService.getStats(company.id),
    ]).then(([l, v, s]) => {
      setListings(l);
      setVehicles(v);
      setStats(s);
    });
  }, [company]);

  // Live adverts, each annotated with its vehicle + live enquiry count (leads).
  const live = useMemo<LiveRow[] | null>(() => {
    if (!listings || !stats) return null;
    return listings
      .filter((l) => l.status === "live")
      .map((l) => ({
        ...l,
        vehicle: vehicles.find((v) => v.id === l.vehicleId) ?? null,
        enq: l.vehicleId ? (stats.byVehicle[l.vehicleId]?.total ?? 0) : 0,
      }));
  }, [listings, vehicles, stats]);

  const kpis = useMemo(() => {
    if (!live) return null;
    const totalEnq = live.reduce((s, l) => s + l.enq, 0);
    const stockValue = live.reduce((s, l) => s + l.price, 0);
    return {
      totalEnq,
      liveCount: live.length,
      perListing: live.length ? (totalEnq / live.length).toFixed(1) : "0",
      stockValue,
    };
  }, [live]);

  // Per-channel: real marketplace attribution (lead.source) over live adverts.
  const channelStats = useMemo(() => {
    if (!live || !stats) return null;
    return CHANNELS.map((c) => {
      const enquiries = live.reduce(
        (s, l) =>
          s + (l.vehicleId ? (stats.byVehicle[l.vehicleId]?.byChannel[c.key] ?? 0) : 0),
        0,
      );
      const onChannel = live.filter((l) => l.channels[c.key]);
      const top = [...live]
        .filter((l) => l.vehicle)
        .sort(
          (a, b) =>
            (stats.byVehicle[b.vehicleId ?? ""]?.byChannel[c.key] ?? 0) -
            (stats.byVehicle[a.vehicleId ?? ""]?.byChannel[c.key] ?? 0),
        )[0];
      const topEnq = top?.vehicleId
        ? (stats.byVehicle[top.vehicleId]?.byChannel[c.key] ?? 0)
        : 0;
      return { ...c, enquiries, liveCount: onChannel.length, top, topEnq };
    });
  }, [live, stats]);
  // Vehicle totals count EVERY lead source; the four cards only count
  // marketplace channels. Surface the remainder (walk-ins, referrals, …) so
  // the cards always reconcile with the Total enquiries KPI (GEN-49).
  const otherEnq = useMemo(() => {
    if (!kpis || !channelStats) return 0;
    const channelled = channelStats.reduce((s, c) => s + c.enquiries, 0);
    return Math.max(0, kpis.totalEnq - channelled);
  }, [kpis, channelStats]);
  // Denominator for "Share of enquiries" — all enquiries, so the shares
  // (incl. Other) sum to 100%. Dividing by the top channel made the labels
  // read 100/33/0/33 (GEN-49).
  const shareOf = (n: number) =>
    kpis && kpis.totalEnq > 0 ? Math.round((n / kpis.totalEnq) * 100) : 0;

  const topAdverts = useMemo(
    () => (live ? [...live].sort((a, b) => b.enq - a.enq).slice(0, 5) : []),
    [live],
  );
  const needsAttention = useMemo(
    () =>
      live
        ? live.filter((l) => l.enq === 0 || (l.vehicle?.daysInStock ?? 0) > STALE_DAYS)
        : [],
    [live],
  );

  return (
    <Page
      title="Performance"
      subtitle="How your adverts are doing across every marketplace channel: enquiries, channel reach and the listings that need attention."
      fullWidth
    >
      {!live || !kpis || !channelStats || !stats ? (
        <Skeleton className="h-96 rounded-(--radius-300)" />
      ) : live.length === 0 ? (
        <Card padding="0">
          <EmptyState
            heading="No live listings yet"
            icon="AnalyticsMinor"
            action={{ content: "Open work list", url: "/advert/work-list" }}
          >
            Publish a vehicle from the work list to start tracking performance.
          </EmptyState>
        </Card>
      ) : (
        <>
          {/* KPI strip — one flush card, tiles split by hairlines */}
          <Card padding="0">
            <div className="grid gap-px bg-(--border-secondary) sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Total enquiries" value={String(kpis.totalEnq)} sub="Across live adverts" />
              <StatTile label="Live listings" value={String(kpis.liveCount)} sub="Currently advertised" />
              <StatTile label="Enquiries per listing" value={kpis.perListing} sub="Average" />
              <StatTile label="Live stock value" value={formatCurrency(kpis.stockValue)} sub="Total advertised price" />
            </div>
          </Card>

          {/* Trend hero — real leads-per-day */}
          <Card
            title="Enquiries over time"
            className="gap-4"
            actions={
              <span className="body-sm text-(--text-secondary)">
                Last {stats.trendDays} days · {stats.leadsTotal} lead{stats.leadsTotal === 1 ? "" : "s"}
              </span>
            }
          >
            {stats.leadsTotal === 0 ? (
              <div className="body-md flex h-45 items-center justify-center text-(--text-secondary)">
                No leads recorded in the last {stats.trendDays} days.
              </div>
            ) : (
              <AreaChart data={stats.trend} />
            )}
          </Card>

          {/* Channel scorecards — real per-marketplace attribution */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {channelStats.map((c) => (
              <Card key={c.key} title={c.label} className="gap-3">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="heading-lg tabular-nums">{c.enquiries}</div>
                    <div className="body-sm text-(--text-secondary)">Enquiries</div>
                  </div>
                  <div className="text-right">
                    <div className="heading-md tabular-nums">{c.liveCount}</div>
                    <div className="body-sm text-(--text-secondary)">Live</div>
                  </div>
                </div>
                <ShareOfEnquiries label={c.label} pct={shareOf(c.enquiries)} />
                <div className="body-sm flex items-center gap-1.5 border-t border-(--border-secondary) pt-2 text-(--text-secondary)">
                  <Trophy className="size-3.5 shrink-0 text-(--icon-secondary)" />
                  {c.top && c.top.vehicle && c.topEnq > 0 ? (
                    <>
                      Top:&nbsp;
                      <RegPlate registration={c.top.vehicle.registration} size="sm" />
                      <span className="shrink-0">· {c.topEnq} enq</span>
                    </>
                  ) : (
                    <span>No enquiries on this channel yet</span>
                  )}
                </div>
              </Card>
            ))}
            {/* Non-marketplace leads (walk-in, referral, repeat customer…) so
                the channel cards always sum to the Total enquiries KPI. */}
            {otherEnq > 0 && (
              <Card title="Other sources" className="gap-3">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="heading-lg tabular-nums">{otherEnq}</div>
                    <div className="body-sm text-(--text-secondary)">Enquiries</div>
                  </div>
                </div>
                <ShareOfEnquiries label="Other sources" pct={shareOf(otherEnq)} />
                <div className="body-sm border-t border-(--border-secondary) pt-2 text-(--text-secondary)">
                  Walk-ins, referrals &amp; other non-marketplace leads
                </div>
              </Card>
            )}
          </div>

          {/* Leaderboards */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              title="Top performing adverts"
              actions={<Trophy className="size-4 text-(--icon-secondary)" aria-hidden />}
            >
              <div className="flex flex-col">
                {topAdverts.map((l, i) => (
                  <div key={l.id} className="flex items-center gap-3 border-b border-(--border-secondary) py-2 last:border-0">
                    <span className="body-sm-semibold w-4 text-center tabular-nums text-(--text-secondary)">
                      {i + 1}
                    </span>
                    {l.vehicle ? (
                      <RegPlate registration={l.vehicle.registration} size="sm" />
                    ) : null}
                    <span className="body-sm min-w-0 flex-1 truncate text-(--text-secondary)">
                      {l.title}
                    </span>
                    <span className="body-md-semibold inline-flex shrink-0 items-center gap-1 tabular-nums">
                      <MessageSquare className="size-3 text-(--icon-secondary)" aria-hidden />
                      {l.enq}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title="Needs attention"
              actions={<TriangleAlert className="size-4 text-(--icon-secondary)" aria-hidden />}
            >
              {needsAttention.length === 0 ? (
                <div className="body-md py-6 text-center text-(--text-secondary)">
                  Every live advert is fresh and getting enquiries.
                </div>
              ) : (
                <div className="flex flex-col">
                  {needsAttention.map((l) => {
                    const days = l.vehicle?.daysInStock ?? 0;
                    const noEnq = l.enq === 0;
                    return (
                      <div key={l.id} className="flex items-center gap-3 border-b border-(--border-secondary) py-2 last:border-0">
                        {l.vehicle ? (
                          <RegPlate registration={l.vehicle.registration} size="sm" />
                        ) : null}
                        <span className="body-sm min-w-0 flex-1 truncate text-(--text-secondary)">
                          {l.title}
                        </span>
                        <span className="shrink-0">
                          <AtIndicatorCell indicator={l.atPriceIndicator} />
                        </span>
                        <Badge tone={noEnq ? "attention" : "critical"} className="shrink-0">
                          {noEnq ? "No enquiries" : `${days}d stale`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </Page>
  );
}
