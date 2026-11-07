"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CircleCheck,
  CircleX,
  Clock,
  Ellipsis,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { salesService } from "@/lib/services/sales-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { authService } from "@/lib/services/auth-service";
import { pipelineStageService } from "@/lib/services/pipeline-stage-service";
import { appointmentService } from "@/lib/services/appointment-service";
import { leadService } from "@/lib/services/lead-service";
import { leadChannelService } from "@/lib/services/lead-channel-service";
import type {
  Appointment,
  LeadChannel,
  LeadSource,
  PipelineStage,
  SalesDeal,
  SalesStage,
  StageBehaviour,
  User,
  Vehicle,
} from "@/lib/types";
import { APPOINTMENT_TYPE_LABELS, LEAD_SOURCES } from "@/lib/types";
import {
  Button,
  ButtonGroup,
  EmptyState,
  IndexTable,
  Link as GenaroLink,
  Page,
  Select,
  useConfirm,
  EmptyStateIllustration,
} from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { PHOTOS_ENABLED } from "@/lib/phase-one";
import { QuickBookModal } from "@/components/calendar/quick-book-modal";
import { ChangeVehicleModal } from "@/components/sales/change-vehicle-modal";
import { CreateLeadModal, type NewLead } from "@/components/sales/create-lead-modal";
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
  todayKey,
} from "@/components/kanban/card-dates";
import type { KanbanColumn, KanbanTone } from "@/components/kanban/stage-icon";
import { formatCurrency, formatDateTime, formatRegPlate, titleCase } from "@/lib/utils";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { toast } from "@/lib/toast";
import { enquirySourceForChannel, enquirySourceOptions, unsaleConfirmOptions } from "@/lib/sale-confirm";
import { CompleteSaleModal } from "@/components/sales/complete-sale-modal";
import type { SaleDetails } from "@/lib/services/sales-service";

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

/** Where the viewer's board-or-list choice is kept. */
const VIEW_KEY = "cc.sales-pipeline.view";

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
  const { can, isSuperUser } = usePermissions();
  const canCreateLead = isSuperUser || can("sales:create_lead");
  const { confirm, confirmDialog } = useConfirm();
  const [deals, setDeals] = useState<SalesDeal[] | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [nowTs, setNowTs] = useState<number | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookDeal, setBookDeal] = useState<SalesDeal | null>(null);
  const [swapDeal, setSwapDeal] = useState<SalesDeal | null>(null);
  // A deal being completed: the sale dialog is open for it.
  const [selling, setSelling] = useState<{
    deal: SalesDeal;
    stage: SalesStage;
    source: string | null;
  } | null>(null);
  const [channels, setChannels] = useState<LeadChannel[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  // Board or list (call 2026-10-31: the board gets hard to scan as it fills).
  // Restored after mount: storage only exists in the browser.
  const [view, setView] = useState<"board" | "list">("board");
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(VIEW_KEY) === "list") setView("list");
    } catch {
      // Blocked storage: the board it is.
    }
  }, []);
  const pickView = (next: "board" | "list") => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // The choice still holds until the page is left.
    }
  };

  // "New lead" in the command palette lands here with ?new=1: open Create lead.
  const searchParams = useSearchParams();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (searchParams.get("new") === "1") setCreateOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!company) return;
    void Promise.all([
      salesService.getAll(company.id),
      pipelineStageService.getEnabled(company.id),
      vehicleService.getAll(company.id),
      authService.getUsersForCompany(company.id),
      appointmentService.getAll(company.id),
      leadChannelService.getEnabled(company.id),
    ]).then(([d, s, v, u, a, c]) => {
      setDeals(d);
      setStages(s);
      setVehicles(v);
      setUsers(u);
      setAppointments(a);
      setChannels(c);
      setNowTs(Date.now());
    })
      // One failed read used to leave the skeleton up for good; say so instead.
      .catch(() => toast.error("Couldn't load the pipeline. Reload the page to try again."));
  }, [company]);

  /**
   * Each deal's next upcoming appointment, shown on its card. Matched on the
   * lead when the deal has one, else on the car and the customer's name.
   */
  /** Whether an appointment belongs to a deal: by its lead, else car and name. */
  const isDealAppointment = (d: SalesDeal, a: Appointment): boolean =>
    d.leadId ? a.leadId === d.leadId : a.vehicleId === d.vehicleId && a.customerName === d.customerName;

  const nextAppointment = useMemo(() => {
    const today = todayKey();
    const upcoming = appointments
      .filter((a) => a.status === "upcoming" && a.date >= today)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    return (d: SalesDeal) => upcoming.find((a) => isDealAppointment(d, a)) ?? null;
  }, [appointments]);

  // Cars a deal can move to: anything still in the business.
  const swappable = useMemo(
    () => vehicles.filter((v) => v.status !== "sold" && v.status !== "returned"),
    [vehicles],
  );

  async function changeDealVehicle(vehicle: Vehicle) {
    if (!user || !company || !swapDeal) return;
    await salesService.changeVehicle(swapDeal.id, vehicle.id, user.id);
    const [d, v] = await Promise.all([
      salesService.getAll(company.id),
      vehicleService.getAll(company.id),
    ]);
    setDeals(d);
    setVehicles(v);
    toast.success(`Vehicle changed to ${vehicle.registration}`);
  }

  /**
   * A lead taken here opens its deal in New lead straight away (call
   * 2026-10-31: leads are created from the pipeline now, not the leads page).
   * A car can have any number of leads (call 2026-11-06): a lead doesn't
   * reserve or sell it, so another customer's deal on the car is no bar.
   */
  async function createLead(lead: NewLead) {
    if (!user || !company) return;
    const channel = channels.find((c) => c.id === lead.leadChannelId);
    const slug = channel?.slug as LeadSource | undefined;
    const source: LeadSource = slug && LEAD_SOURCES.includes(slug) ? slug : "other";
    const notes = lead.channelOtherReason
      ? `Channel: ${lead.channelOtherReason}${lead.notes ? `\n\n${lead.notes}` : ""}`
      : lead.notes;
    const created = await leadService.create(
      {
        companyId: company.id,
        customerName: lead.customerName,
        customerPhone: lead.customerPhone,
        customerEmail: lead.customerEmail,
        vehicleInterest: lead.vehicleInterest,
        vehicleId: lead.vehicle.id,
        leadType: lead.leadType,
        source,
        leadChannelId: lead.leadChannelId,
        assignedTo: lead.assignedTo,
        notes,
      },
      user.id,
    );
    await salesService.create({
      companyId: company.id,
      vehicleId: lead.vehicle.id,
      leadId: created.id,
      customerName: lead.customerName,
      customerPhone: lead.customerPhone,
      customerEmail: lead.customerEmail,
      sellingAgent: lead.assignedTo,
    });
    setDeals(await salesService.getAll(company.id));
    toast.success(`Lead created for ${lead.customerName}`);
  }

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
      // A closed sale ages off the board after a fortnight.
      (d) => !(wonSlugs.has(d.stage) && d.completionDate && d.completionDate < cutoff),
    );
  }, [deals, stages, nowTs]);

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
    // Completing the sale marks the car sold too, so the sale dialog asks for
    // its details first; the card moves once they are saved.
    const into = stages.find((s) => s.slug === stage);
    if (into?.behaviour === "won") {
      const lead = target.leadId ? await leadService.getById(target.leadId).catch(() => null) : null;
      const vehicle = vehicleById.get(target.vehicleId);
      setSelling({
        deal: target,
        stage,
        source:
          vehicle?.sellingAgent ||
          enquirySourceForChannel(channels.find((c) => c.id === lead?.leadChannelId)),
      });
      return;
    }
    // Moving a completed sale back undoes it, so say what that clears.
    const from = stages.find((s) => s.slug === target.stage);
    if (from?.behaviour === "won") {
      const reg = vehicleById.get(target.vehicleId)?.registration ?? null;
      if (!(await confirm(unsaleConfirmOptions(target.customerName, reg, into?.label ?? stage)))) return;
    }
    await moveDeal(target, stage);
  }

  async function moveDeal(target: SalesDeal, stage: SalesStage, sale?: SaleDetails) {
    if (!user || !company || !deals) return;
    const id = target.id;
    const prevDeals = deals;
    // Optimistic: the card should land in its new column the instant it's
    // dropped, not after updateStage's write chain + a full refetch resolve
    // — that round trip previously left the board looking unresponsive
    // ("clicks not registering") for a second or more (GEN-70).
    setDeals(deals.map((d) => (d.id === id ? movedDeal(d, stage) : d)));
    const label = stages.find((s) => s.slug === stage)?.label ?? stage;
    try {
      await salesService.updateStage(id, stage, user.id, sale);
      // The car changes with the deal (sold, or back on sale), so both reload.
      const [d, v] = await Promise.all([
        salesService.getAll(company.id),
        vehicleService.getAll(company.id),
      ]);
      setDeals(d);
      setVehicles(v);
      toast.success(`Moved → ${label}`);
    } catch (e) {
      setDeals(prevDeals);
      toast.error(e instanceof Error ? e.message : "Couldn't move the deal");
      // The sale dialog shows the failure and stays open.
      if (sale) throw e;
    }
  }

  /** Whole days since the deal last moved, from the instant the data landed. */
  const daysInStage = (d: SalesDeal): number =>
    nowTs ? Math.max(0, Math.round((nowTs - new Date(d.updatedAt).getTime()) / 86_400_000)) : 0;

  // The list: open deals in stage order, then newest activity. Lost deals
  // stay off it, as the board starts with their column hidden.
  const stageOrder = new Map(stages.map((s, i) => [s.slug, i]));
  const lostSlugs = new Set(stages.filter((s) => s.behaviour === "lost").map((s) => s.slug));
  const listDeals = (boardDeals ?? [])
    .filter((d) => !lostSlugs.has(columnOf(d)))
    .sort(
      (a, b) =>
        (stageOrder.get(columnOf(a)) ?? 0) - (stageOrder.get(columnOf(b)) ?? 0) ||
        compareDeals(a, b),
    );
  const stageOptions = stages.map((s) => ({ label: s.label, value: s.slug }));

  return (
    <Page
      title="Sales pipeline"
      subtitle="Track every deal from new lead to completed sale. Rename, reorder, add or remove stages in Settings."
      fullWidth
      primaryAction={
        canCreateLead ? { content: "Create lead", onAction: () => setCreateOpen(true) } : undefined
      }
      controls={
        <ButtonGroup variant="segmented">
          <Button pressed={view === "board"} onClick={() => pickView("board")}>
            Board
          </Button>
          <Button pressed={view === "list"} onClick={() => pickView("list")}>
            List
          </Button>
        </ButtonGroup>
      }
    >
      {/* An empty board shows its empty state even before any stages
          exist, rather than a skeleton that never resolves. */}
      {deals && deals.length === 0 ? (
        <EmptyState illustration={<EmptyStateIllustration variant="kanban" />} heading="No deals yet">
          Create a lead and its deal appears here in New lead.
        </EmptyState>
      ) : !boardDeals ? (
        <KanbanSkeleton columns={5} />
      ) : view === "list" ? (
        <IndexTable
          selectable={false}
          headings={[
            { title: "Customer" },
            { title: "Vehicle" },
            { title: "Stage" },
            { title: "Agent" },
            { title: "Value", alignment: "end" },
            { title: "Next appointment" },
            { title: "In stage", alignment: "end" },
          ]}
          onRowClick={(id) => router.push(`/sales/pipeline/${id}`)}
          rows={listDeals.map((d) => {
            const v = vehicleById.get(d.vehicleId);
            const value = dealValue(d);
            const appt = nextAppointment(d);
            return {
              id: d.id,
              cells: [
                d.customerName,
                v ? (
                  // The plate, the car under it, as on the dashboard's Recent deals.
                  <span className="flex min-w-0 flex-col items-start gap-1">
                    <RegPlate registration={v.registration} size="sm" />
                    <span className="truncate text-(--text-secondary)">
                      {titleCase(`${v.make} ${v.model}`)}
                    </span>
                  </span>
                ) : (
                  <span className="text-(--text-secondary)">No vehicle</span>
                ),
                // Moving here runs the same path as a drag on the board. Its
                // list opens in a portal, whose clicks still reach the row in
                // React, so they stop here rather than open the deal.
                <div key="stage" className="w-48" onClick={(e) => e.stopPropagation()}>
                  <Select
                    label={`Stage for ${d.customerName}`}
                    labelHidden
                    options={stageOptions}
                    value={columnOf(d)}
                    onChange={(stage) => void handleMove(d.id, stage)}
                  />
                </div>,
                userById.get(d.sellingAgent)?.name ?? "No agent",
                <span key="value" className="tabular-nums">
                  {value != null ? formatCurrency(value) : "—"}
                </span>,
                appt
                  ? `${APPOINTMENT_TYPE_LABELS[appt.appointmentType ?? "viewing"]}, ${dayDate(appt.date)}, ${appt.time.slice(0, 5)}`
                  : "—",
                <span key="days" className="tabular-nums">{`${daysInStage(d)}d`}</span>,
              ],
            };
          })}
        />
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
          getLabel={(d) => {
            const v = vehicleById.get(d.vehicleId);
            return [d.customerName, v ? formatRegPlate(v.registration) : null].filter(Boolean).join(", ");
          }}
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
            const open = behaviour !== "won" && behaviour !== "lost";
            const appt = open ? nextAppointment(d) : null;
            return (
              <KanbanCard
                // Compact, so a long column shows more deals; the phone and
                // deposit are in the deal's own view (call 2026-10-31).
                compact
                onOpen={() => router.push(`/sales/pipeline/${d.id}`)}
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
                  <GenaroLink
                    monochrome
                    removeUnderline
                    className="text-left hover:underline"
                    url={`/sales/pipeline/${d.id}`}
                  >
                    {d.customerName}
                  </GenaroLink>
                }
                titleText={d.customerName}
                facts={[
                  dateFact(d, behaviour),
                  appt
                    ? {
                        icon: CalendarClock,
                        tone: daysUntil(appt.date) === 0 ? "caution" : undefined,
                        // The type leads: a collection reads differently from a viewing.
                        text: APPOINTMENT_TYPE_LABELS[appt.appointmentType ?? "viewing"],
                        detail:
                          daysUntil(appt.date) === 0
                            ? `today, ${appt.time.slice(0, 5)}`
                            : `${dayDate(appt.date)}, ${appt.time.slice(0, 5)}`,
                        title: "Next appointment",
                      }
                    : null,
                  {
                    icon: Clock,
                    tone: ageTone(days),
                    text: `${days}d in stage`,
                    title: `Updated ${formatDateTime(d.updatedAt)}`,
                  },
                ]}
                note={
                  behaviour === "lost" && d.notes?.trim()
                    ? { icon: CircleX, tone: "critical", text: `Lost: ${d.notes.trim()}` }
                    : undefined
                }
                person={{ name: agent?.name, picture: agent?.avatarUrl ?? undefined, empty: "No agent" }}
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
                      <DropdownMenuItem onClick={() => router.push(`/sales/pipeline/${d.id}`)}>
                        View deal
                      </DropdownMenuItem>
                      {open && v ? (
                        <DropdownMenuItem onClick={() => setBookDeal(d)}>
                          Book appointment
                        </DropdownMenuItem>
                      ) : null}
                      {behaviour !== "won" ? (
                        <DropdownMenuItem onClick={() => setSwapDeal(d)}>
                          Change vehicle
                        </DropdownMenuItem>
                      ) : null}
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
                quickAction={
                  open && v ? (
                    <Button
                      variant="tertiary"
                      size="micro"
                      icon={<CalendarPlus />}
                      accessibilityLabel={`Book appointment for ${d.customerName}`}
                      title="Book appointment"
                      onClick={() => setBookDeal(d)}
                    />
                  ) : undefined
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

      <QuickBookModal
        booking={bookDeal ? { kind: "appt", deal: bookDeal } : null}
        vehicles={swappable}
        onClose={() => setBookDeal(null)}
        onBooked={() => {
          if (company) void appointmentService.getAll(company.id).then(setAppointments);
        }}
      />

      <ChangeVehicleModal
        open={swapDeal !== null}
        onClose={() => setSwapDeal(null)}
        customerName={swapDeal?.customerName ?? ""}
        current={swapDeal ? (vehicleById.get(swapDeal.vehicleId) ?? null) : null}
        vehicles={swappable}
        onSave={changeDealVehicle}
      />
      <CreateLeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        vehicles={swappable}
        channels={channels}
        users={users.filter((u) => u.active)}
        defaultAssignee={user?.id}
        draftKey={company && user ? `cc-lead-draft:${company.id}:${user.id}` : null}
        onCreate={createLead}
      />
      <CompleteSaleModal
        open={selling !== null}
        customerName={selling?.deal.customerName ?? ""}
        vehicle={selling ? (vehicleById.get(selling.deal.vehicleId) ?? null) : null}
        stageLabel={stages.find((s) => s.slug === selling?.stage)?.label ?? "Completed sale"}
        defaultPrice={
          selling
            ? (selling.deal.agreedPrice ??
              selling.deal.offerPrice ??
              vehicleById.get(selling.deal.vehicleId)?.sellingPrice ??
              vehicleById.get(selling.deal.vehicleId)?.listingPrice ??
              null)
            : null
        }
        defaultSource={selling?.source ?? null}
        sourceOptions={enquirySourceOptions(vehicles.map((v) => v.sellingAgent), selling?.source)}
        onClose={() => setSelling(null)}
        onConfirm={async (sale) => {
          if (!selling) return;
          await moveDeal(selling.deal, selling.stage, sale);
          setSelling(null);
        }}
      />
      {confirmDialog}
    </Page>
  );
}
