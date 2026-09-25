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
import type { Capability } from "@/lib/capabilities";
import { Card, SkeletonDisplayText } from "@/components/polaris";
import { cn } from "@/lib/utils";

interface Stats {
  carsInStock: number;
  carsInReadiness: number;
  soldThisMonth: number;
  openClaims: number;
  newLeads24h: number;
  avgDays: number | null;
  inspectionsPending: number;
  activeJobs: number;
  /** Same-window prior periods, for the deltas. See DELTA note on KpiDef. */
  soldLastMonth: number;
  newLeadsPrev24h: number;
}

type Delta = { text: string; dir: "up" | "down" | "flat" };

/** Signed figure with its own sign glyph — U+2212, not a hyphen. */
function signed(n: number, suffix = ""): Delta {
  if (n === 0) return { text: `0${suffix}`, dir: "flat" };
  return n > 0
    ? { text: `+${n}${suffix}`, dir: "up" }
    : { text: `−${Math.abs(n)}${suffix}`, dir: "down" };
}

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
  delta?: (s: Stats) => Delta;
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
    value: (s) => String(s.carsInStock),
  },
  {
    key: "inspections_pending",
    label: "Inspections pending",
    icon: ClipboardCheck,
    href: "/maintenance/inspection",
    requiredAnyOf: ["inspection:run", "inspection:add_note"],
    value: (s) => String(s.inspectionsPending),
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
    value: (s) => String(s.activeJobs),
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
    value: (s) => String(s.carsInReadiness),
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
    value: (s) => String(s.soldThisMonth),
    delta: (s) => signed(s.soldThisMonth - s.soldLastMonth),
  },
  {
    key: "new_leads_24h",
    label: "New leads (24h)",
    icon: Inbox,
    href: "/sales/leads",
    requiredAnyOf: ["sales:create_lead", "sales:edit_lead"],
    value: (s) => String(s.newLeads24h),
    delta: (s) => signed(s.newLeads24h - s.newLeadsPrev24h),
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
    value: (s) => String(s.openClaims),
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
    value: (s) => (s.avgDays === null ? "—" : `${s.avgDays}d`),
  },
];

export function DashboardKpiRow() {
  const { company } = useAuth();
  const { can, isSuperUser } = usePermissions();
  const [data, setData] = useState<{
    vehicles: Awaited<ReturnType<typeof vehicleService.getAll>>;
    claims: Awaited<ReturnType<typeof claimService.getAll>>;
    leads: Awaited<ReturnType<typeof leadService.getAll>>;
    jobs: Awaited<ReturnType<typeof maintenanceService.getAll>>;
    deals: Awaited<ReturnType<typeof salesService.getAll>>;
    /** When the batch landed — the clock every KPI is measured against. */
    fetchedAt: number;
  } | null>(null);

  useEffect(() => {
    if (!company) return;
    void Promise.all([
      vehicleService.getAll(company.id),
      claimService.getAll(company.id),
      leadService.getAll(company.id),
      maintenanceService.getAll(company.id),
      salesService.getAll(company.id),
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
    // "In stock" = vehicles still in the live pipeline. Exclude terminal /
    // dead-end states (sold, returned) so a returned car isn't counted as
    // stock — it also skews Avg Days in Stock.
    const NON_LIVE_STATUSES = new Set(["sold", "returned"]);
    const activeVehicles = data.vehicles.filter(
      (v) => !NON_LIVE_STATUSES.has(v.status) && v.removedFromWebsiteAt === null,
    );
    const carsInStock = activeVehicles.length;
    const carsInReadiness = activeVehicles.filter(
      (v) => v.status === "ready",
    ).length;
    const inspectionsPending = activeVehicles.filter(
      (v) => v.status === "inspection_pending",
    ).length;
    const activeJobs = data.jobs.filter(
      (j) => j.status === "pending" || j.status === "in_progress",
    ).length;
    // A vehicle counts as sold this month if its date_sold says so OR a deal
    // for it completed this month (historic completions predate the write-back
    // of date_sold onto the vehicle, GEN-43). Union, deduped per vehicle.
    const soldVehicleIds = new Set<string>();
    for (const v of data.vehicles) {
      if (v.dateSold && new Date(v.dateSold).getTime() >= monthStart) {
        soldVehicleIds.add(v.id);
      }
    }
    for (const d of data.deals) {
      if (
        d.stage === "completed_sale" &&
        d.completionDate &&
        new Date(d.completionDate).getTime() >= monthStart
      ) {
        soldVehicleIds.add(d.vehicleId);
      }
    }
    const soldThisMonth = soldVehicleIds.size;
    // Same union rule over the previous calendar month, so the delta compares
    // like with like rather than a differently-counted number.
    const soldLastMonthIds = new Set<string>();
    for (const v of data.vehicles) {
      if (!v.dateSold) continue;
      const t = new Date(v.dateSold).getTime();
      if (t >= lastMonthStart && t < monthStart) soldLastMonthIds.add(v.id);
    }
    for (const d of data.deals) {
      if (d.stage !== "completed_sale" || !d.completionDate) continue;
      const t = new Date(d.completionDate).getTime();
      if (t >= lastMonthStart && t < monthStart) soldLastMonthIds.add(d.vehicleId);
    }
    const soldLastMonth = soldLastMonthIds.size;
    const openClaims = data.claims.filter(
      (c) => c.status === "open" || c.status === "under_review",
    ).length;
    const newLeads24h = data.leads.filter(
      (l) => now - new Date(l.createdAt).getTime() <= 86_400_000,
    ).length;
    const newLeadsPrev24h = data.leads.filter((l) => {
      const age = now - new Date(l.createdAt).getTime();
      return age > 86_400_000 && age <= 172_800_000;
    }).length;
    const withDays = activeVehicles.filter(
      (v) => typeof v.daysInStock === "number",
    );
    const avgDays =
      withDays.length === 0
        ? null
        : Math.round(
            withDays.reduce((sum, v) => sum + (v.daysInStock ?? 0), 0) /
              withDays.length,
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
    // Polaris analytics stat tiles: ONE flush card, one row of metrics split
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
