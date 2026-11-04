"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { salesService } from "@/lib/services/sales-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { pipelineStageService } from "@/lib/services/pipeline-stage-service";
import { authService } from "@/lib/services/auth-service";
import type { PipelineStage, SalesDeal, User, Vehicle } from "@/lib/types";
import { Button, Card, EmptyState, EmptyStateIllustration, IndexTable, SkeletonBodyText } from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { DealStageBadge } from "@/components/sales/status-badges";
import { titleCase } from "@/lib/utils";

/** How many of the newest deals the table shows. */
const SHOWN = 6;

/** "29 Oct" from a timestamp, in the viewer's time zone. */
const dayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * The cars most recently added to the pipeline, newest first (call
 * 2026-11-01): the car, the customer, where the deal stands, its agent and
 * the day it was added. A click anywhere on a row opens the deal (the
 * customer is its link, for the keyboard); Margin and Total came off while
 * the sheet's figures are still being cleaned.
 * @import import { DashboardRecentDeals } from "@/components/dashboard/dashboard-recent-deals";
 */
export function DashboardRecentDeals() {
  const { company } = useAuth();
  const router = useRouter();
  const [deals, setDeals] = useState<SalesDeal[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!company) return;
    void Promise.all([
      salesService.getAll(company.id),
      vehicleService.getAll(company.id),
      pipelineStageService.getEnabled(company.id),
      authService.getUsersForCompany(company.id),
    ]).then(([d, v, s, u]) => {
      setDeals(d);
      setVehicles(v);
      setStages(s);
      setUsers(u);
    });
  }, [company]);

  const newest = useMemo(
    () =>
      deals ? [...deals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, SHOWN) : null,
    [deals],
  );
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const stageBySlug = useMemo(() => new Map(stages.map((s) => [s.slug, s])), [stages]);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  return (
    <Card padding="0">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
        <h2 className="heading-sm text-(--text)">Recent deals</h2>
        <Button variant="plain" url="/sales/pipeline">
          View all
        </Button>
      </div>

      {newest === null ? (
        <div className="px-4 pb-4">
          <SkeletonBodyText lines={6} />
        </div>
      ) : newest.length === 0 ? (
        <EmptyState
          compact
          illustration={<EmptyStateIllustration variant="kanban" size="small" />}
          heading="No deals yet"
        >
          A lead created on the pipeline shows up here.
        </EmptyState>
      ) : (
        <IndexTable
          // The card above draws the surface; the table sits flush inside it.
          className="rounded-none shadow-none"
          selectable={false}
          primaryColumn={1}
          headings={[
            { title: "Vehicle" },
            { title: "Customer" },
            { title: "Stage" },
            { title: "Agent" },
            { title: "Added", alignment: "end" },
          ]}
          onRowClick={(id) => router.push(`/sales/pipeline/${id}`)}
          rows={newest.map((d) => {
            const v = vehicleById.get(d.vehicleId);
            const stage = stageBySlug.get(d.stage);
            return {
              id: d.id,
              url: `/sales/pipeline/${d.id}`,
              cells: [
                v ? (
                  <div className="flex min-w-0 flex-col items-start gap-1" key="vehicle">
                    <RegPlate registration={v.registration} size="sm" />
                    <span className="truncate text-(--text-secondary)">
                      {titleCase(`${v.make} ${v.model}`)}
                    </span>
                  </div>
                ) : (
                  "—"
                ),
                d.customerName,
                <DealStageBadge key="stage" stage={d.stage} label={stage?.label} behaviour={stage?.behaviour} />,
                userById.get(d.sellingAgent)?.name ?? "—",
                <span className="tabular-nums text-(--text-secondary)" key="added">
                  {dayMonth(d.createdAt)}
                </span>,
              ],
            };
          })}
        />
      )}
    </Card>
  );
}
