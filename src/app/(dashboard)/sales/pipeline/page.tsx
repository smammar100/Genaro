"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Banknote,
  CalendarDays,
  CircleCheck,
  CircleX,
  Clock,
  Ellipsis,
  Phone,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { salesService } from "@/lib/services/sales-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { authService } from "@/lib/services/auth-service";
import { pipelineStageService } from "@/lib/services/pipeline-stage-service";
import type {
  PipelineStage,
  SalesDeal,
  SalesStage,
  StageBehaviour,
  User,
  Vehicle,
} from "@/lib/types";
import {
  Avatar,
  Button,
  EmptyState,
  Link as PolarisLink,
  Page,
  Select,
  type SelectOption,
} from "@/components/polaris";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { PHOTOS_ENABLED } from "@/lib/phase-one";
import { DealDetailSheet } from "@/components/sales/deal-detail-sheet";
import { RowActionButton } from "@/components/ui/resource-list";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KanbanBoard, KanbanSkeleton } from "@/components/kanban/kanban-board";
import {
  KanbanCard,
  KanbanPlate,
  type KanbanFact,
} from "@/components/kanban/kanban-card";
import {
  dayDate,
  daysUntil,
  shortDate,
} from "@/components/kanban/card-dates";
import type { KanbanColumn, KanbanTone } from "@/components/kanban/stage-icon";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { toast } from "@/lib/toast";

// Per-stage tone for the column's status glyph (no coloured column top-bars).
// The shipped stages keep a fixed tone; user-added stages cycle through the
// rest by position, so a new column never renders unstyled (GEN-65).
const STAGE_TONE: Record<string, KanbanTone> = {
  new_lead: "neutral",
  contacted: "info",
  test_drive: "magic",
  offer_made: "caution",
  deposit_taken: "warning",
  collection_delivery: "emphasis",
  completed_sale: "success",
  lost: "critical",
};

const FALLBACK_TONE: KanbanTone[] = ["info", "magic", "success", "caution"];

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

/** Days since the deal last moved: fine for a fortnight, then caution, then critical past a month. */
function ageTone(days: number): "muted" | "caution" | "critical" {
  if (days <= 14) return "muted";
  if (days <= 30) return "caution";
  return "critical";
}

/**
 * The deal's date line: when it completed or was lost, or else the collection
 * date, in words and tone once it's today or past. Open deals without one get
 * no line; their time in stage says how fresh they are.
 */
function dateFact(d: SalesDeal, behaviour: StageBehaviour | undefined): KanbanFact | null {
  if (behaviour === "won") {
    return {
      icon: CircleCheck,
      tone: "success",
      text: d.completionDate ? `Completed ${shortDate(d.completionDate)}` : "Completed",
    };
  }
  if (behaviour === "lost") {
    return { icon: CircleX, tone: "muted", text: `Lost ${shortDate(d.updatedAt)}` };
  }
  if (!d.collectionDate) return null;
  const days = daysUntil(d.collectionDate);
  const date = dayDate(d.collectionDate);
  if (days < 0) {
    return { icon: TriangleAlert, tone: "critical", text: "Collection overdue", detail: date };
  }
  if (days === 0) return { icon: Clock, tone: "caution", text: "Collection today" };
  return { icon: CalendarDays, text: `Collection ${days === 1 ? "tomorrow" : date}` };
}

/** Newest activity first, the service's own order; it also places the drop slot. */
const compareDeals = (a: SalesDeal, b: SalesDeal): number =>
  b.updatedAt.localeCompare(a.updatedAt);

/** A deal as it will be once moved: the stage changes and it counts as just updated. */
const movedDeal = (d: SalesDeal, stage: string): SalesDeal => ({
  ...d,
  stage,
  updatedAt: new Date().toISOString(),
});

export default function SalesPipelinePage() {
  const router = useRouter();
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

  const boardDeals = useMemo(() => {
    if (!deals || stages.length === 0) return null;
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
    return deals.filter(
      (d) =>
        (agentFilter === "all" || d.sellingAgent === agentFilter) &&
        // A closed sale ages off the board after a fortnight.
        !(wonSlugs.has(d.stage) && d.completionDate && d.completionDate < cutoff),
    );
  }, [deals, stages, agentFilter, nowTs]);

  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  // A deal whose stage was deleted or disabled has no column. Rather than
  // vanish, it falls into the first stage so it stays workable.
  const stageSlugs = useMemo(() => new Set(stages.map((s) => s.slug)), [stages]);
  const columnOf = (d: SalesDeal) =>
    stageSlugs.has(d.stage) ? d.stage : (stages[0]?.slug ?? d.stage);

  const columns = useMemo<KanbanColumn[]>(() => {
    const totals = new Map<string, number>();
    for (const d of boardDeals ?? []) {
      const slug = stageSlugs.has(d.stage) ? d.stage : stages[0]?.slug;
      if (slug) totals.set(slug, (totals.get(slug) ?? 0) + (dealValue(d) ?? 0));
    }
    return stages.map((s, i) => ({
      id: s.slug,
      label: s.label,
      tone: STAGE_TONE[s.slug] ?? FALLBACK_TONE[i % FALLBACK_TONE.length],
      kind: s.behaviour === "won" ? "done" : s.behaviour === "lost" ? "exception" : "open",
      glyph: s.behaviour === "lost" ? "cross" : undefined,
      summary: totals.get(s.slug) ? fmtTotal(totals.get(s.slug) ?? 0) : undefined,
    }));
  }, [stages, stageSlugs, boardDeals]);

  async function handleMove(id: string, stage: SalesStage) {
    if (!user || !company || !deals) return;
    const target = deals.find((d) => d.id === id);
    if (!target || target.stage === stage) return;
    const prevDeals = deals;
    // Optimistic: the card should land in its new column the instant it's
    // dropped, not after updateStage's write chain + a full refetch resolve
    // — that round trip previously left the board looking unresponsive
    // ("clicks not registering") for a second or more (GEN-70).
    setDeals(deals.map((d) => (d.id === id ? movedDeal(d, stage) : d)));
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

  // Each agent with their avatar; "All agents" clears the filter. Deactivated
  // accounts only appear while they still have deals on the board (and say
  // so), so a name never shows up twice for no reason.
  const agentsWithDeals = new Set((deals ?? []).map((d) => d.sellingAgent));
  const agentOptions: SelectOption[] = [
    { label: "All agents", value: "all", media: <Avatar size="xs" /> },
    ...users
      .filter(
        (u) =>
          (u.role === "sales" || u.role === "owner" || u.role === "admin") &&
          (u.active || agentsWithDeals.has(u.id)),
      )
      .map((u) => ({
        label: u.active ? u.name : `${u.name} (deactivated)`,
        value: u.id,
        media: <Avatar size="xs" name={u.name} source={u.avatarUrl ?? undefined} />,
      })),
  ];

  return (
    <Page
      title="Sales pipeline"
      subtitle="Track every deal from new lead to completed sale. Rename, reorder, add or remove stages in Settings."
      fullWidth
      // The agent filter scopes the whole board, so it sits in the header's
      // top-right corner rather than in a row of its own above the columns.
      controls={
        deals && deals.length > 0 ? (
          <div className="w-56">
            {/* Unfiltered, the field just asks "Select agent"; a chosen
                agent shows as their avatar and name. */}
            <Select
              label="Agent"
              labelHidden
              placeholder="Select agent"
              options={agentOptions}
              value={agentFilter === "all" ? "" : agentFilter}
              onChange={(v) => setAgentFilter(v)}
            />
          </div>
        ) : undefined
      }
    >
      {/* An empty board shows its empty state even before any stages
          exist, rather than a skeleton that never resolves. */}
      {deals && deals.length === 0 ? (
        <EmptyState heading="No deals yet" icon={<TrendingUp />}>
          Convert a lead into an appointment, then a deal will appear.
        </EmptyState>
      ) : !boardDeals ? (
        <KanbanSkeleton columns={5} />
      ) : (
        <KanbanBoard
          id="sales-pipeline"
          columns={columns}
          items={boardDeals}
          getId={(d) => d.id}
          getColumnId={columnOf}
          compare={compareDeals}
          moved={movedDeal}
          onMove={(id, stage) => void handleMove(id, stage)}
          noun={{ one: "deal", many: "deals" }}
          defaultHidden={stages.filter((s) => s.behaviour === "lost").map((s) => s.slug)}
          renderCard={(d, { column }) => {
            const v = vehicleById.get(d.vehicleId);
            const agent = userById.get(d.sellingAgent);
            const value = dealValue(d);
            const days = nowTs
              ? Math.max(
                  0,
                  Math.round((nowTs - new Date(d.updatedAt).getTime()) / 86_400_000),
                )
              : 0;
            // Invoicing opens once money is committed — any stage that
            // reserves the car or completes the sale, whatever it has been
            // renamed to (GEN-65).
            const behaviour = stages.find((s) => s.slug === column.id)?.behaviour;
            const showInvoiceCta = behaviour === "reserved" || behaviour === "won";
            const invoiceUrl = v
              ? `/sales/invoice-generation?vehicleId=${v.id}`
              : "/sales/invoice-generation";
            return (
              <KanbanCard
                onOpen={() => setViewDeal(d)}
                thumbnail={
                  v && PHOTOS_ENABLED ? (
                    <VehicleImage
                      vehicle={v}
                      variant="thumb"
                      sizes="48px"
                      className="w-12 rounded-(--radius-200)"
                    />
                  ) : undefined
                }
                identity={
                  v ? (
                    <KanbanPlate
                      registration={v.registration}
                      href={vehicleDetailHref(v.id, pathname)}
                      title="Open vehicle"
                    />
                  ) : (
                    <span className="body-sm text-(--text-secondary)">No vehicle</span>
                  )
                }
                reference={v?.stockId}
                vehicle={v ? `${v.make} ${v.model}` : undefined}
                title={
                  <PolarisLink
                    monochrome
                    removeUnderline
                    className="text-left hover:underline"
                    onClick={() => setViewDeal(d)}
                  >
                    {d.customerName}
                  </PolarisLink>
                }
                titleText={d.customerName}
                facts={[
                  dateFact(d, behaviour),
                  d.customerPhone
                    ? {
                        icon: Phone,
                        text: (
                          <a
                            href={`tel:${d.customerPhone.replace(/\s+/g, "")}`}
                            draggable={false}
                            className="hover:underline"
                          >
                            {d.customerPhone}
                          </a>
                        ),
                      }
                    : null,
                  d.depositAmount
                    ? {
                        icon: Banknote,
                        text: `${formatCurrency(d.depositAmount)} deposit`,
                        detail: d.depositDate ? `paid ${shortDate(d.depositDate)}` : "paid",
                      }
                    : null,
                  {
                    icon: Clock,
                    tone: ageTone(days),
                    text: `${days}d in stage`,
                    title: `Updated ${formatRelativeTime(d.updatedAt)}`,
                  },
                ]}
                note={
                  behaviour === "lost" && d.notes?.trim()
                    ? { icon: CircleX, tone: "critical", text: `Lost: ${d.notes.trim()}` }
                    : undefined
                }
                person={{ name: agent?.name, empty: "No agent" }}
                money={
                  value != null
                    ? {
                        value: formatCurrency(value),
                        kind: d.agreedPrice != null ? "agreed" : "offer",
                      }
                    : undefined
                }
                menu={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <RowActionButton aria-label="Deal actions" className="size-6">
                        <Ellipsis />
                      </RowActionButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewDeal(d)}>View deal</DropdownMenuItem>
                      {v ? (
                        <DropdownMenuItem
                          onClick={() => router.push(vehicleDetailHref(v.id, pathname))}
                        >
                          View vehicle
                        </DropdownMenuItem>
                      ) : null}
                      {showInvoiceCta ? (
                        <DropdownMenuItem onClick={() => router.push(invoiceUrl)}>
                          Generate invoice
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
                action={
                  showInvoiceCta ? (
                    <Button fullWidth icon="OrdersMinor" url={invoiceUrl}>
                      Generate invoice
                    </Button>
                  ) : undefined
                }
              />
            );
          }}
        />
      )}

      <DealDetailSheet
        deal={viewDeal}
        vehicle={viewDeal ? (vehicleById.get(viewDeal.vehicleId) ?? null) : null}
        agent={viewDeal ? (userById.get(viewDeal.sellingAgent) ?? null) : null}
        users={users}
        open={viewDeal !== null}
        onOpenChange={(o) => {
          if (!o) setViewDeal(null);
        }}
      />
    </Page>
  );
}
