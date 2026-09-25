"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, Clock, Check, Car } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { salesService } from "@/lib/services/sales-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { authService } from "@/lib/services/auth-service";
import { pipelineStageService } from "@/lib/services/pipeline-stage-service";
import type {
  PipelineStage,
  SalesDeal,
  SalesStage,
  User,
  Vehicle,
} from "@/lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Link as PolarisLink,
  Page,
  Select,
  SkeletonBodyText,
} from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { DealDetailSheet } from "@/components/sales/deal-detail-sheet";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { toast } from "@/lib/toast";
import { DragHandle } from "@/components/shared/drag-handle";

// Per-stage accent dot (no coloured column top-bars). Semantic icon tokens,
// so the dots follow the theme. The shipped stages keep a fixed colour; user-
// added stages cycle through the rest by position, so a new column never
// renders unstyled (GEN-65).
const STAGE_DOT: Record<string, string> = {
  new_lead: "bg-(--icon-secondary)",
  contacted: "bg-(--icon-info)",
  test_drive: "bg-(--icon-magic)",
  offer_made: "bg-(--icon-caution)",
  deposit_taken: "bg-(--icon-warning)",
  collection_delivery: "bg-(--icon-emphasis)",
  completed_sale: "bg-(--icon-success)",
  lost: "bg-(--icon-critical)",
};

const FALLBACK_DOT: string[] = [
  "bg-(--icon-info)",
  "bg-(--icon-magic)",
  "bg-(--icon-success)",
  "bg-(--icon-caution)",
];

const dotFor = (slug: string, index: number) =>
  STAGE_DOT[slug] ?? FALLBACK_DOT[index % FALLBACK_DOT.length];

/**
 * A completed sale drops off the live board a fortnight after it closes —
 * agreed on the UAT call (GEN-65). It stays in Closed Deals and the master
 * sheet; this only stops the board turning into an archive.
 */
const COMPLETED_VISIBLE_DAYS = 14;

const dealValue = (d: SalesDeal): number | null =>
  d.agreedPrice ?? d.offerPrice ?? null;

const fmtTotal = (n: number): string =>
  `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

function ageTone(days: number): string {
  if (days <= 14) return "text-(--text-secondary)";
  if (days <= 30) return "text-(--text-caution)";
  return "text-(--text-critical)";
}

export default function SalesPipelinePage() {
  const pathname = usePathname();
  const { user, company } = useAuth();
  const [deals, setDeals] = useState<SalesDeal[] | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [agentFilter, setAgentFilter] = useState<string | "all">("all");
  const [nowTs, setNowTs] = useState<number | null>(null);
  const [viewDeal, setViewDeal] = useState<SalesDeal | null>(null);

  useEffect(() => {
    if (!company) return;
    void Promise.all([
      salesService.getAll(company.id),
      pipelineStageService.getEnabled(company.id),
      vehicleService.getAll(company.id),
      authService.getUsersForCompany(company.id),
    ]).then(([d, s, v, u]) => {
      setDeals(d);
      setStages(s);
      setVehicles(v);
      setUsers(u);
      setNowTs(Date.now());
    });
  }, [company]);

  const filteredDeals = useMemo(() => {
    if (!deals) return null;
    return agentFilter === "all"
      ? deals
      : deals.filter((d) => d.sellingAgent === agentFilter);
  }, [deals, agentFilter]);

  const grouped = useMemo(() => {
    if (!filteredDeals || stages.length === 0) return null;
    // `nowTs` is stamped once after the data loads (it also drives the card age
    // counters) — reading the clock during render is neither pure nor stable.
    const cutoff = new Date(
      (nowTs ?? 0) - COMPLETED_VISIBLE_DAYS * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    const wonSlugs = new Set(
      stages.filter((s) => s.behaviour === "won").map((s) => s.slug),
    );
    const map: Record<string, SalesDeal[]> = Object.fromEntries(
      stages.map((s) => [s.slug, [] as SalesDeal[]]),
    );
    for (const d of filteredDeals) {
      // A closed sale ages off the board after a fortnight.
      if (
        wonSlugs.has(d.stage) &&
        d.completionDate &&
        d.completionDate < cutoff
      ) {
        continue;
      }
      // A deal whose stage was deleted or disabled has no column. Rather than
      // vanish, it falls into the first stage so it stays workable.
      (map[d.stage] ?? map[stages[0].slug]).push(d);
    }
    return map;
  }, [filteredDeals, stages, nowTs]);

  async function handleMove(id: string, stage: SalesStage) {
    if (!user || !company || !deals) return;
    const target = deals.find((d) => d.id === id);
    if (!target || target.stage === stage) return;
    const prevDeals = deals;
    // Optimistic: the card should land in its new column the instant it's
    // dropped, not after updateStage's write chain + a full refetch resolve
    // — that round trip previously left the board looking unresponsive
    // ("clicks not registering") for a second or more (GEN-70).
    setDeals(deals.map((d) => (d.id === id ? { ...d, stage } : d)));
    const label = stages.find((s) => s.slug === stage)?.label ?? stage;
    try {
      await salesService.updateStage(id, stage, user.id);
      setDeals(await salesService.getAll(company.id));
      toast.success(`Moved → ${label}`);
    } catch (e) {
      setDeals(prevDeals);
      toast.error(e instanceof Error ? e.message : "Couldn't move the deal");
    }
  }

  const agentOptions = [
    { label: "All agents", value: "all" },
    ...users
      .filter(
        (u) => u.role === "sales" || u.role === "owner" || u.role === "admin",
      )
      .map((u) => ({ label: u.name, value: u.id })),
  ];

  return (
    <Page
      title="Sales pipeline"
      subtitle="Track every deal from new lead to completed sale. Rename, reorder, add or remove stages in Settings."
      fullWidth
    >
      <div className="flex justify-end">
        <div className="w-48">
          <Select
            label="Agent"
            labelInline
            options={agentOptions}
            value={agentFilter}
            onChange={(v) => setAgentFilter(v)}
          />
        </div>
      </div>

      {/* An empty board shows its empty state even before any stages
          exist, rather than a skeleton that never resolves. */}
      {deals && deals.length === 0 ? (
        <EmptyState heading="No deals yet" icon={<TrendingUp />}>
          Convert a lead into an appointment, then a deal will appear.
        </EmptyState>
      ) : !grouped ? (
        <Card>
          <SkeletonBodyText lines={8} />
        </Card>
      ) : (
        <div className="grid auto-cols-[260px] grid-flow-col gap-3 overflow-x-auto pb-2">
          {stages.map((stage, stageIndex) => {
            const list = grouped[stage.slug] ?? [];
            const total = list.reduce((s, d) => s + (dealValue(d) ?? 0), 0);
            return (
              <div
                key={stage.slug}
                className="flex flex-col gap-2 rounded-(--radius-300) bg-(--bg-surface-secondary) p-2 transition-shadow"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("ring-2", "ring-(--border-focus)");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("ring-2", "ring-(--border-focus)");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("ring-2", "ring-(--border-focus)");
                  const dealId = e.dataTransfer.getData("text/deal-id");
                  if (dealId) void handleMove(dealId, stage.slug);
                }}
              >
                <div className="flex flex-col gap-0.5 px-1.5 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="heading-sm inline-flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 rounded-full",
                          dotFor(stage.slug, stageIndex),
                        )}
                      />
                      {stage.label}
                    </h2>
                    <Badge>{String(list.length)}</Badge>
                  </div>
                  {total > 0 ? (
                    <span className="body-sm tabular-nums text-(--text-secondary)">
                      {fmtTotal(total)}
                    </span>
                  ) : null}
                </div>

                <div className="flex min-h-12 flex-col gap-2">
                  {list.length === 0 ? (
                    <div className="body-sm rounded-(--radius-200) border border-dashed border-(--border) p-3 text-center text-(--text-secondary)">
                      No deals
                    </div>
                  ) : (
                    list.map((d) => {
                      const v = vehicles.find((x) => x.id === d.vehicleId);
                      const agent = users.find((u) => u.id === d.sellingAgent);
                      const days = nowTs
                        ? Math.max(
                            0,
                            Math.round(
                              (nowTs - new Date(d.updatedAt).getTime()) /
                                86_400_000,
                            ),
                          )
                        : 0;
                      // Invoicing opens once money is committed — any stage
                      // that reserves the car or completes the sale, whatever
                      // it has been renamed to (GEN-65).
                      const showInvoiceCta =
                        stage.behaviour === "reserved" ||
                        stage.behaviour === "won";
                      return (
                        <div
                          key={d.id}
                          className="group/card relative cursor-grab overflow-hidden rounded-(--radius-300) bg-(--bg-surface) shadow-(--shadow-100) transition-shadow hover:shadow-(--shadow-200) active:cursor-grabbing"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/deal-id", d.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                        >
                          {/* The grip sits above the image rather than in
                              it, on a surface chip so it reads over a photo. */}
                          <DragHandle className="absolute left-1.5 top-1.5 z-10 rounded-(--radius-100) bg-(--bg-surface) p-0.5 text-(--icon-secondary) shadow-(--shadow-100)" />
                          {/* Image header — plate + price over the photo */}
                          <div className="relative">
                            {/* A vehicle with no hero image gets a clean
                                surface + car-icon placeholder (GEN-52). */}
                            {v && v.heroImageUrl ? (
                              <Link
                                href={vehicleDetailHref(v.id, pathname)}
                                title="Open vehicle details"
                                className="block"
                              >
                                <VehicleImage
                                  vehicle={v}
                                  variant="card"
                                  className="rounded-none"
                                />
                              </Link>
                            ) : v ? (
                              <Link
                                href={vehicleDetailHref(v.id, pathname)}
                                title="Open vehicle details"
                                aria-label="Open vehicle details"
                                className="grid aspect-[16/10] w-full place-items-center bg-(--bg-surface-secondary) text-(--icon-secondary)"
                              >
                                <Car className="size-8" strokeWidth={1.4} />
                              </Link>
                            ) : (
                              <div className="grid aspect-[16/10] w-full place-items-center bg-(--bg-surface-secondary) text-(--icon-secondary)">
                                <Car className="size-6" />
                              </div>
                            )}
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5">
                              {v ? (
                                <Link
                                  href={vehicleDetailHref(v.id, pathname)}
                                  title="Open vehicle details"
                                  className="pointer-events-auto transition-opacity hover:opacity-80"
                                >
                                  <RegPlate registration={v.registration} size="sm" />
                                </Link>
                              ) : (
                                <span />
                              )}
                              {dealValue(d) != null ? (
                                <span className="body-sm-semibold rounded-(--radius-100) bg-(--bg-surface) px-1.5 py-0.5 tabular-nums text-(--text) shadow-(--shadow-100)">
                                  {formatCurrency(dealValue(d))}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <PolarisLink
                                monochrome
                                removeUnderline
                                className="heading-sm truncate text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewDeal(d);
                                }}
                              >
                                {d.customerName}
                              </PolarisLink>
                              <span
                                className={cn(
                                  "body-sm inline-flex shrink-0 items-center gap-1",
                                  ageTone(days),
                                )}
                              >
                                <Clock className="size-3" />
                                {days}d
                              </span>
                            </div>
                            <p className="body-sm line-clamp-1 text-(--text-secondary)">
                              {v ? `${v.make} ${v.model}` : "—"}
                            </p>
                            <div className="flex items-center justify-between gap-2">
                              {agent ? (
                                <Avatar
                                  name={agent.name}
                                  size="xs"
                                  label={
                                    <span className="body-sm truncate text-(--text-secondary)">
                                      {agent.name}
                                    </span>
                                  }
                                  className="min-w-0"
                                />
                              ) : (
                                <span />
                              )}
                              <span className="body-xs inline-flex shrink-0 items-center gap-1 text-(--text-secondary)">
                                <Check className="size-3 text-(--icon-success)" />
                                {formatRelativeTime(d.updatedAt)}
                              </span>
                            </div>
                            {showInvoiceCta && (
                              <Button
                                fullWidth
                                icon="OrdersMinor"
                                className="mt-1"
                                url={
                                  v
                                    ? `/sales/invoice-generation?vehicleId=${v.id}`
                                    : "/sales/invoice-generation"
                                }
                              >
                                Generate invoice
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DealDetailSheet
        deal={viewDeal}
        vehicle={
          viewDeal
            ? (vehicles.find((v) => v.id === viewDeal.vehicleId) ?? null)
            : null
        }
        agent={
          viewDeal
            ? (users.find((u) => u.id === viewDeal.sellingAgent) ?? null)
            : null
        }
        users={users}
        open={viewDeal !== null}
        onOpenChange={(o) => {
          if (!o) setViewDeal(null);
        }}
      />
    </Page>
  );
}
