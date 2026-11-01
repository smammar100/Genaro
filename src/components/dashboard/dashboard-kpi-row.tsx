"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Car,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Inbox,
  Sparkles,
  ClipboardCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { vehicleService } from "@/lib/services/vehicle-service";
import { claimService } from "@/lib/services/claim-service";
import { leadService } from "@/lib/services/lead-service";
import { maintenanceService } from "@/lib/services/maintenance-service";
import { salesService } from "@/lib/services/sales-service";
import { isInStock } from "@/lib/stock";
import type { Capability } from "@/lib/capabilities";
import { Card, SkeletonDisplayText } from "@/components/genaro";
import { cn } from "@/lib/utils";

/** Each figure, or null when its data couldn't be read (shown as "—"). */
interface Stats {
  carsInStock: number | null;
  carsInReadiness: number | null;
  soldThisMonth: number | null;
  openClaims: number | null;
  newLeads24h: number | null;
  avgDays: number | null;
  inspectionsPending: number | null;
  activeJobs: number | null;
  /** Same-window prior periods, for the deltas. See DELTA note on KpiDef. */
  soldLastMonth: number | null;
  newLeadsPrev24h: number | null;
}

/** A figure for its tile: the number, or a dash when it couldn't be read. */
const fig = (n: number | null, suffix = "") => (n === null ? "—" : `${n}${suffix}`);

type Delta = { text: string; dir: "up" | "down" | "flat" };

/** Signed figure with its own sign glyph — U+2212, not a hyphen. */
function signed(n: number, suffix = ""): Delta {
  if (n === 0) return { text: `0${suffix}`, dir: "flat" };
  return n > 0
    ? { text: `+${n}${suffix}`, dir: "up" }
    : { text: `−${Math.abs(n)}${suffix}`, dir: "down" };
}

/** The change against the prior period, when both sides were read. */
const change = (now: number | null, before: number | null): Delta | null =>
  now === null || before === null ? null : signed(now - before);

/**
 * Each KPI declares the capabilities that make it relevant. A card shows only
 * when the user is a super-user or holds ANY of `requiredAnyOf` — so every
 * role sees a dashboard scoped to their job (Inspector sees inspection/workshop
 * numbers, Sales sees leads/sold, Finance sees financial figures, etc.).
 */
interface KpiDef {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  requiredAnyOf: Capability[];
  value: (s: Stats) => string;
  /**
   * DELTA — the comparison beside the figure (rule 3: a number alone cannot be
   * judged). Only defined where the app can actually derive a prior period
   * from data it already loads. The rest have no delta rather than a made-up
   * one; adding those needs a stored history the app does not keep yet.
   */
  delta?: (s: Stats) => Delta | null;
  /**
   * Operational KPIs are tailored for hands-on roles (Inspector, Workshop).
   * Super-users / admins see the canonical 6-card overview instead, so these
   * are hidden from them to avoid an unbalanced 8-card row.
   */
  operational?: boolean;
}

const KPI_DEFS: KpiDef[] = [
  {
    key: "cars_in_stock",
    label: "Cars in stock",
    icon: Car,
    href: "/vehicles",
    requiredAnyOf: [
      "inventory:add",
      "inventory:edit",
      "inspection:run",
      "maintenance:create",
      "photos:process",
      "advert:create",
      "admin:view_master_sheet",
    ],
    value: (s) => fig(s.carsInStock),
  },
  {
    key: "inspections_pending",
    label: "Inspections pending",
    icon: ClipboardCheck,
    href: "/maintenance/inspection",
    requiredAnyOf: ["inspection:run", "inspection:add_note"],
    value: (s) => fig(s.inspectionsPending),
    operational: true,
  },
  {
    key: "active_jobs",
    label: "Active workshop jobs",
    icon: Wrench,
    href: "/maintenance/workshop",
    requiredAnyOf: [
      "maintenance:create",
      "maintenance:edit",
      "maintenance:complete",
      "workshop:add_note",
    ],
    value: (s) => fig(s.activeJobs),
    operational: true,
  },
  {
    key: "cars_in_readiness",
    label: "Cars in readiness",
    icon: CheckCircle2,
    href: "/vehicles?status=ready",
    requiredAnyOf: [
      "inventory:edit",
      "advert:create",
      "advert:edit",
      "sales:create_lead",
      "admin:view_master_sheet",
    ],
    value: (s) => fig(s.carsInReadiness),
  },
  {
    key: "sold_this_month",
    label: "Sold this month",
    icon: TrendingUp,
    href: "/sales/deals",
    requiredAnyOf: [
      "sales:mark_sold",
      "sales:edit_pipeline_stage",
      "admin:view_financials",
    ],
    value: (s) => fig(s.soldThisMonth),
    delta: (s) => change(s.soldThisMonth, s.soldLastMonth),
  },
  {
    key: "new_leads_24h",
    label: "New leads (24h)",
    icon: Inbox,
    href: "/sales/pipeline",
    requiredAnyOf: ["sales:create_lead", "sales:edit_lead"],
    value: (s) => fig(s.newLeads24h),
    delta: (s) => change(s.newLeads24h, s.newLeadsPrev24h),
  },
  {
    key: "open_claims",
    // "Warranty Open Claims" truncated to "WARRANTY OPEN C…" in its tile at
    // desktop widths (GEN-44); the shield icon + /warranties/claims link carry
    // the warranty context, so the short label loses nothing.
    label: "Open claims",
    icon: ShieldAlert,
    href: "/warranties/claims",
    requiredAnyOf: [
      "warranty:raise_claim",
      "warranty:resolve_claim",
      "warranty:create",
      "warranty:edit",
    ],
    value: (s) => fig(s.openClaims),
  },
  {
    key: "avg_days",
    label: "Avg days in stock",
    icon: Sparkles,
    href: "/admin/master-sheet",
    requiredAnyOf: [
      "admin:view_financials",
      "admin:view_master_sheet",
      "inventory:edit",
    ],
    value: (s) => fig(s.avgDays, "d"),
  },
];

export function DashboardKpiRow() {
  const { company } = useAuth();
  const { can, isSuperUser } = usePermissions();
  // Each source may be null: one that fails to load blanks only its own
  // figures, not the whole row (2026-11-01).
  const [data, setData] = useState<{
    vehicles: Awaited<ReturnType<typeof vehicleService.getAll>> | null;
    claims: Awaited<ReturnType<typeof claimService.getAll>> | null;
    leads: Awaited<ReturnType<typeof leadService.getAll>> | null;
    jobs: Awaited<ReturnType<typeof maintenanceService.getAll>> | null;
    deals: Awaited<ReturnType<typeof salesService.getAll>> | null;
    /** When the batch landed — the clock every KPI is measured against. */
    fetchedAt: number;
  } | null>(null);

  useEffect(() => {
    if (!company) return;
    const settle = <T,>(read: Promise<T>): Promise<T | null> => read.catch(() => null);
    void Promise.all([
      settle(vehicleService.getAll(company.id)),
      settle(claimService.getAll(company.id)),
      settle(leadService.getAll(company.id)),
      settle(maintenanceService.getAll(company.id)),
      settle(salesService.getAll(company.id)),
    ]).then(([vehicles, claims, leads, jobs, deals]) => {
      setData({ vehicles, claims, leads, jobs, deals, fetchedAt: Date.now() });
    });
  }, [company]);

  const stats = useMemo<Stats | null>(() => {
    if (!data) return null;
    // Stamped when the data landed rather than read here, so the memo stays
    // pure and every figure below is measured from the same instant.
    const now = data.fetchedAt;
    const today = new Date(now);
    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    ).getTime();
    // Previous calendar month, for the Sold delta. Month -1 with day 1 rolls
    // the year back on its own in January.
    const lastMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    ).getTime();
    // "In stock" is the master sheet's Available, the same rule as All
    // vehicles. The workflow status alone counted imported cars the sheet
    // marks sold or returned to owner: 205 against ~120 (call 2026-10-31).
    const { vehicles, deals, jobs, claims, leads } = data;
    const activeVehicles = vehicles?.filter(isInStock) ?? null;
    const count = <T,>(list: T[] | null, keep: (x: T) => boolean) =>
      list === null ? null : list.filter(keep).length;
    const carsInStock = activeVehicles?.length ?? null;
    const carsInReadiness = count(activeVehicles, (v) => v.status === "ready");
    const inspectionsPending = count(activeVehicles, (v) => v.status === "inspection_pending");
    const activeJobs = count(jobs, (j) => j.status === "pending" || j.status === "in_progress");
    // A vehicle counts as sold in a month if its date_sold says so OR a deal
    // for it completed then (historic completions predate the write-back of
    // date_sold onto the vehicle, GEN-43). Union, deduped per vehicle; the
    // previous month by the same rule, so the delta compares like with like.
    const soldBetween = (from: number, to: number): number | null => {
      if (vehicles === null && deals === null) return null;
      const ids = new Set<string>();
      for (const v of vehicles ?? []) {
        if (!v.dateSold) continue;
        const t = new Date(v.dateSold).getTime();
        if (t >= from && t < to) ids.add(v.id);
      }
      for (const d of deals ?? []) {
        if (d.stage !== "completed_sale" || !d.completionDate) continue;
        const t = new Date(d.completionDate).getTime();
        if (t >= from && t < to) ids.add(d.vehicleId);
      }
      return ids.size;
    };
    const soldThisMonth = soldBetween(monthStart, Infinity);
    const soldLastMonth = soldBetween(lastMonthStart, monthStart);
    const openClaims = count(claims, (c) => c.status === "open" || c.status === "under_review");
    const newLeads24h = count(leads, (l) => now - new Date(l.createdAt).getTime() <= 86_400_000);
    const newLeadsPrev24h = count(leads, (l) => {
      const age = now - new Date(l.createdAt).getTime();
      return age > 86_400_000 && age <= 172_800_000;
    });
    // Days counted from each car's arrival (vehicleService works it out live;
    // the stored figure drifts), so this matches the cars' own pages.
    const avgDays =
      activeVehicles === null || activeVehicles.length === 0
        ? null
        : Math.round(
            activeVehicles.reduce((sum, v) => sum + v.daysInStock, 0) / activeVehicles.length,
          );
    return {
      carsInStock,
      carsInReadiness,
      soldThisMonth,
      openClaims,
      newLeads24h,
      avgDays,
      inspectionsPending,
      activeJobs,
      soldLastMonth,
      newLeadsPrev24h,
    };
  }, [data]);

  const visibleKpis = useMemo(() => {
    // Admin-overview viewers (super-users, or anyone with the financials /
    // master-sheet view) get the canonical 6-card overview — the operational
    // KPIs (Inspections Pending, Active Workshop Jobs) are for hands-on roles,
    // so we hide them here to avoid an unbalanced 8-card row.
    const isOverviewViewer =
      isSuperUser || can("admin:view_financials") || can("admin:view_master_sheet");
    return KPI_DEFS.filter((k) => {
      if (k.operational && isOverviewViewer) return false;
      return isSuperUser || k.requiredAnyOf.some((c) => can(c));
    });
  }, [can, isSuperUser]);

  if (visibleKpis.length === 0) return null;

  return (
    // Genaro analytics stat tiles: ONE flush card, one row of metrics split
    // by hairline dividers; wraps to 2 / 3 columns on narrower screens.
    <Card padding="0">
      <div className="grid grid-cols-2 p-1 sm:grid-cols-3 xl:flex xl:items-stretch xl:divide-x xl:divide-(--border-secondary)">
        {visibleKpis.map((k) => {
          const delta = stats && k.delta ? k.delta(stats) : null;
          return (
            <Link
              className="flex min-w-0 flex-1 flex-col gap-1 rounded-(--radius-200) px-3 py-2 no-underline transition-colors hover:bg-(--bg-surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
              href={k.href}
              key={k.key}
            >
              <span className="body-md truncate text-(--text-secondary) underline decoration-(--border-tertiary) decoration-dotted underline-offset-4">
                {k.label}
              </span>
              <span className="flex items-baseline gap-2">
                {stats === null ? (
                  <SkeletonDisplayText size="small" />
                ) : (
                  <span className="heading-lg text-(--text) tabular-nums">
                    {k.value(stats)}
                  </span>
                )}
                {delta && delta.dir !== "flat" ? (
                  <span
                    className={cn(
                      "body-sm tabular-nums",
                      delta.dir === "up" && "text-(--text-success)",
                      delta.dir === "down" && "text-(--text-critical)",
                    )}
                  >
                    {delta.text}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
