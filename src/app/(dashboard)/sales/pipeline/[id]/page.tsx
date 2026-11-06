"use client";

import { use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CalendarClock, Car } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { salesService, type DealParticulars, type SaleDetails } from "@/lib/services/sales-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import { authService } from "@/lib/services/auth-service";
import { pipelineStageService } from "@/lib/services/pipeline-stage-service";
import { appointmentService } from "@/lib/services/appointment-service";
import { leadService } from "@/lib/services/lead-service";
import { leadChannelService } from "@/lib/services/lead-channel-service";
import { dealNoteService } from "@/lib/services/deal-note-service";
import {
  APPOINTMENT_TYPE_LABELS,
  LEAD_TYPE_LABELS,
  type Appointment,
  type DealNote,
  type Lead,
  type LeadChannel,
  type PipelineStage,
  type SalesDeal,
  type User,
  type Vehicle,
} from "@/lib/types";
import {
  Avatar,
  Button,
  Card,
  DescriptionList,
  EmptyState,
  Page,
  SkeletonBodyText,
  SplitButton,
  TextField,
  useConfirm,
  EmptyStateIllustration,
} from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { DealStageBadge } from "@/components/sales/status-badges";
import { StagePath } from "@/components/sales/stage-path";
import { QuickBookModal } from "@/components/calendar/quick-book-modal";
import { ChangeVehicleModal } from "@/components/sales/change-vehicle-modal";
import { CompleteSaleModal } from "@/components/sales/complete-sale-modal";
import { DealParticularsModal, balanceDue } from "@/components/sales/deal-particulars-modal";
import {
  FUEL_OPTIONS,
  SERVICE_HISTORY_OPTIONS,
  TRANSMISSION_OPTIONS,
  optionLabel,
} from "@/lib/master-sheet";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { vehicleDetailHref } from "@/lib/vehicle-nav";
import { toast } from "@/lib/toast";
import { locationLabel } from "@/lib/locations";
import { useCompanyLocations } from "@/hooks/use-company-locations";
import {
  enquirySourceForChannel,
  enquirySourceOptions,
  lostConfirmOptions,
  unsaleConfirmOptions,
} from "@/lib/sale-confirm";

interface Loaded {
  deal: SalesDeal;
  stages: PipelineStage[];
  vehicle: Vehicle | null;
  vehicles: Vehicle[];
  users: User[];
  appointments: Appointment[];
  lead: Lead | null;
  channels: LeadChannel[];
  notes: DealNote[];
  /** The viewing day (migration 0060), read on its own. */
  viewingDate: string | null;
  /** When the data landed, for the days-in-stage count. */
  at: number;
}

const APPOINTMENT_STATUS: Record<Appointment["status"], string> = {
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

/** Whether an appointment belongs to the deal: by its lead, else car and name. */
const isDealAppointment = (d: SalesDeal, a: Appointment): boolean =>
  d.leadId ? a.leadId === d.leadId : a.vehicleId === d.vehicleId && a.customerName === d.customerName;

/** A description-list row, or nothing when there is no value to show. */
const row = (term: string, value: ReactNode) =>
  value === null || value === undefined || value === "" ? [] : [{ term, description: value }];

/**
 * A deal on its own page (prototype variation E, after the Salesforce lead
 * record; call 2026-10-31 asked for the whole car and the whole deal in one
 * place). The stages run across the top with the key figures under them;
 * the customer, the vehicle and the activity sit side by side below. Opened
 * from a pipeline card or list row.
 */
export default function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const pathname = usePathname();
  const { user, company } = useAuth();
  const [data, setData] = useState<Loaded | null>(null);
  const [missing, setMissing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [booking, setBooking] = useState(false);
  const [swapping, setSwapping] = useState(false);
  // The won stage the sale dialog is completing into, while it is open.
  const [selling, setSelling] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  const customLocations = useCompanyLocations();

  // Fetches everything the page shows; null when the deal isn't there.
  const fetchDeal = useCallback(async (): Promise<Loaded | null> => {
    if (!company) return null;
    const deal = await salesService.getById(id);
    if (!deal) return null;
    const [stages, vehicles, users, appointments, lead, channels, notes, viewingDate] = await Promise.all([
      pipelineStageService.getEnabled(company.id),
      vehicleService.getAll(company.id),
      authService.getUsersForCompany(company.id),
      appointmentService.getAll(company.id),
      deal.leadId ? leadService.getById(deal.leadId) : Promise.resolve(null),
      leadChannelService.getAll(company.id),
      dealNoteService.getForDeal(deal.id),
      salesService.getViewingDate(deal.id),
    ]);
    return {
      deal,
      stages,
      vehicle: vehicles.find((v) => v.id === deal.vehicleId) ?? null,
      vehicles,
      users,
      appointments: appointments
        .filter((a) => isDealAppointment(deal, a))
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
      lead,
      channels,
      notes,
      viewingDate,
      at: Date.now(),
    };
  }, [company, id]);

  const apply = (loaded: Loaded | null) => {
    if (loaded) setData(loaded);
    else setMissing(true);
  };
  const load = () => fetchDeal().then(apply);

  useEffect(() => {
    if (!company) return;
    void fetchDeal().then(apply);
  }, [company, fetchDeal]);

  const stageOf = useMemo(
    () => new Map((data?.stages ?? []).map((s) => [s.slug, s])),
    [data?.stages],
  );

  // Stable between loads, so the edit dialog doesn't reset while it's open.
  const particulars = useMemo(
    () => ({
      agreedPrice: data?.deal.agreedPrice ?? null,
      depositAmount: data?.deal.depositAmount ?? null,
      depositDate: data?.deal.depositDate ?? null,
      collectionDate: data?.deal.collectionDate ?? null,
      viewingDate: data?.viewingDate ?? null,
    }),
    [data],
  );

  if (missing) {
    return (
      <Page title="Deal" backAction={{ content: "Sales pipeline", url: "/sales/pipeline" }}>
        <EmptyState illustration={<EmptyStateIllustration variant="notFound" />} heading="This deal isn't here any more" action={{ content: "Open the pipeline", url: "/sales/pipeline" }}>
          It may have been removed, or the link is from another company.
        </EmptyState>
      </Page>
    );
  }

  if (!data) {
    return (
      <Page title="Deal" backAction={{ content: "Sales pipeline", url: "/sales/pipeline" }}>
        <Card>
          <SkeletonBodyText lines={6} />
        </Card>
      </Page>
    );
  }

  const { deal, stages, vehicle, users, appointments, lead, channels, notes } = data;
  const stage = stageOf.get(deal.stage);
  const behaviour = stage?.behaviour;
  const open = behaviour !== "won" && behaviour !== "lost";
  const agent = users.find((u) => u.id === deal.sellingAgent);
  const channel = channels.find((c) => c.id === lead?.leadChannelId);
  const days = Math.max(0, Math.round((data.at - new Date(deal.updatedAt).getTime()) / 86_400_000));
  const upcoming = appointments.find((a) => a.status === "upcoming");
  // The stage after this one on the path, skipping Lost; none once it's won.
  const path = stages.filter((s) => s.behaviour !== "lost");
  const next = open ? path[path.findIndex((s) => s.slug === deal.stage) + 1] : undefined;
  const canInvoice = behaviour === "reserved" || behaviour === "won";
  const lost = stages.find((s) => s.behaviour === "lost");
  const swappable = data.vehicles.filter((v) => v.status !== "sold" && v.status !== "returned");

  // Completing the sale asks for its details first (bug list 2026-11-02,
  // item 2); undoing one says what it clears.
  async function move(slug: string) {
    if (!user || slug === deal.stage) return;
    const target = stageOf.get(slug);
    if (target?.behaviour === "won") {
      setSelling(slug);
      return;
    }
    if (behaviour === "won") {
      const ok = await confirm(
        unsaleConfirmOptions(deal.customerName, vehicle?.registration ?? null, target?.label ?? slug),
      );
      if (!ok) return;
    }
    await moveTo(slug);
  }

  async function moveTo(slug: string, sale?: SaleDetails) {
    if (!user) return;
    setMoving(true);
    try {
      await salesService.updateStage(deal.id, slug, user.id, sale);
      toast.success(`Moved to ${stageOf.get(slug)?.label ?? slug}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't move the deal");
    } finally {
      setMoving(false);
    }
  }

  // The sale dialog's Save: a failure stays in the dialog, with its message.
  async function completeSale(sale: SaleDetails) {
    if (!user || !selling) return;
    await salesService.updateStage(deal.id, selling, user.id, sale);
    setSelling(null);
    toast.success(`${vehicle?.registration ?? "The car"} marked as sold`);
    await load();
  }

  async function saveParticulars(patch: DealParticulars & { viewingDate?: string | null }) {
    const { viewingDate, ...rest } = patch;
    if (Object.keys(rest).length > 0) await salesService.updateParticulars(deal.id, rest);
    if (viewingDate !== undefined) await salesService.setViewingDate(deal.id, viewingDate);
    toast.success("Deal updated");
    await load();
  }

  // The deal fell through, so ask first. The car goes back on sale only when
  // this deal's deposit is what reserves it.
  async function markLost(slug: string) {
    const releasesCar = behaviour === "reserved" && vehicle?.status === "reserved";
    const ok = await confirm(
      lostConfirmOptions(deal.customerName, vehicle?.registration ?? null, releasesCar),
    );
    if (ok) await move(slug);
  }

  async function addNote() {
    if (!user || !note.trim()) return;
    setSavingNote(true);
    try {
      const added = await dealNoteService.add({ dealId: deal.id, userId: user.id, content: note.trim() });
      setData((d) => (d ? { ...d, notes: [...d.notes, added] } : d));
      setNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add the note");
    } finally {
      setSavingNote(false);
    }
  }

  async function changeVehicle(v: Vehicle) {
    if (!user) return;
    await salesService.changeVehicle(deal.id, v.id, user.id);
    toast.success(`Vehicle changed to ${v.registration}`);
    await load();
  }

  const value = deal.agreedPrice ?? deal.offerPrice;
  const balance = balanceDue(deal.agreedPrice, deal.depositAmount);
  const figures: [string, ReactNode][] = [
    ["Price", vehicle?.listingPrice != null ? formatCurrency(vehicle.listingPrice) : "—"],
    [deal.agreedPrice != null ? "Agreed" : "Offer", value != null ? formatCurrency(value) : "—"],
    ["Agent", agent?.name ?? "No agent"],
    [
      "Next appointment",
      upcoming
        ? `${APPOINTMENT_TYPE_LABELS[upcoming.appointmentType ?? "viewing"]}, ${formatDate(upcoming.date)}, ${upcoming.time.slice(0, 5)}`
        : "None booked",
    ],
  ];

  return (
    <Page
      title={`${deal.customerName}${vehicle ? ` · ${vehicle.make} ${vehicle.model}` : ""}`}
      titleMetadata={<DealStageBadge stage={deal.stage} label={stage?.label} behaviour={behaviour} />}
      backAction={{ content: "Sales pipeline", url: "/sales/pipeline" }}
      // One split button on the right: the next stage, with the rarer moves
      // under its arrow (call 2026-10-31).
      controls={
        <>
          {open && vehicle ? <Button onClick={() => setBooking(true)}>Book appointment</Button> : null}
          {canInvoice ? (
            <Button
              variant={behaviour === "won" ? "primary" : undefined}
              url={`/sales/invoice-generation?vehicleId=${deal.vehicleId}`}
            >
              Generate invoice
            </Button>
          ) : null}
          {next ? (
            <SplitButton
              onAction={() => void move(next.slug)}
              disabled={moving}
              actions={[
                { content: "Change vehicle", onAction: () => setSwapping(true) },
                ...(lost
                  ? [{ content: "Mark as lost", destructive: true, onAction: () => void markLost(lost.slug) }]
                  : []),
              ]}
            >
              {next.behaviour === "won" ? "Mark as sold" : `Move to ${next.label}`}
            </SplitButton>
          ) : null}
          {behaviour === "lost" && path[0] ? (
            <Button variant="primary" loading={moving} onClick={() => void move(path[0].slug)}>
              Reopen deal
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex flex-col gap-4">
            <StagePath stages={stages} current={deal.stage} daysInStage={open ? days : undefined} />
            <dl className="grid grid-cols-2 gap-4 pt-1 md:grid-cols-4">
              {figures.map(([term, description]) => (
                <div key={term} className="flex min-w-0 flex-col">
                  <dt className="body-sm text-(--text-secondary)">{term}</dt>
                  <dd className="body-md-semibold truncate tabular-nums">{description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.3fr]">
          <div className="flex min-w-0 flex-col gap-4">
          <Card title="Customer">
            <DescriptionList
              gap="tight"
              descriptionAlign="end"
              items={[
                ...row("Name", deal.customerName),
                ...row("Phone", deal.customerPhone ? <a href={`tel:${deal.customerPhone.replace(/\s+/g, "")}`} className="hover:underline">{deal.customerPhone}</a> : null),
                ...row("Email", deal.customerEmail ? <a href={`mailto:${deal.customerEmail}`} className="hover:underline">{deal.customerEmail}</a> : null),
                ...row("Channel", channel?.label),
                ...row("Lead type", lead ? LEAD_TYPE_LABELS[lead.leadType ?? "viewing"] : null),
                ...row("Opened", formatDateTime(deal.createdAt)),
              ]}
            />
          </Card>

          {/* The deal's particulars, editable here (bug list 2026-11-02, item 4). */}
          <Card
            title="Deal"
            actions={
              <Button variant="plain" onClick={() => setEditing(true)}>
                Edit
              </Button>
            }
          >
            <DescriptionList
              gap="tight"
              descriptionAlign="end"
              items={[
                { term: "Agreed total price", description: deal.agreedPrice != null ? formatCurrency(deal.agreedPrice) : "—" },
                {
                  term: "Deposit paid",
                  description:
                    deal.depositAmount != null
                      ? `${formatCurrency(deal.depositAmount)}${deal.depositDate ? `, ${formatDate(deal.depositDate)}` : ""}`
                      : "—",
                },
                { term: "Balance due", description: balance != null ? formatCurrency(balance) : "—" },
                { term: "Date of viewing", description: data.viewingDate ? formatDate(data.viewingDate) : "—" },
                { term: "Date of collection", description: deal.collectionDate ? formatDate(deal.collectionDate) : "—" },
                ...row("Completed", deal.completionDate ? formatDate(deal.completionDate) : null),
              ]}
            />
          </Card>
          </div>

          <Card title="Vehicle">
            {vehicle ? (
              <div className="flex flex-col gap-3">
                <Link
                  href={vehicleDetailHref(vehicle.id, pathname)}
                  className="-m-1 flex flex-wrap items-center gap-2 rounded-(--radius-200) p-1 transition-colors hover:bg-(--bg-surface-hover)"
                >
                  <RegPlate registration={vehicle.registration} size="sm" />
                  <span className="body-sm text-(--text-secondary)">
                    {vehicle.variantName ? `${vehicle.variantName} · ` : ""}
                    <span className="font-code">{vehicle.stockId}</span>
                  </span>
                </Link>
                <DescriptionList
                  gap="tight"
                  descriptionAlign="end"
                  items={[
                    ...row("Year", vehicle.year || null),
                    ...row("Mileage", vehicle.mileage ? `${vehicle.mileage.toLocaleString("en-GB")} miles` : null),
                    ...row("Fuel", optionLabel(FUEL_OPTIONS, vehicle.fuelType)),
                    ...row("Gearbox", optionLabel(TRANSMISSION_OPTIONS, vehicle.transmission)),
                    ...row("Colour", vehicle.colour),
                    ...row("Keys", vehicle.numKeys || null),
                    ...row("Former keepers", vehicle.formerKeepers),
                    ...row("Service history", optionLabel(SERVICE_HISTORY_OPTIONS, vehicle.serviceHistory)),
                    ...row("MOT expiry", vehicle.motExpiry ? formatDate(vehicle.motExpiry) : null),
                    ...row("Location", locationLabel(vehicle.currentLocation, customLocations)),
                  ]}
                />
              </div>
            ) : (
              <p className="body-md inline-flex items-center gap-1.5 text-(--text-secondary)">
                <Car aria-hidden className="size-4" /> No vehicle linked
              </p>
            )}
          </Card>

          <Card title="Activity">
            <div className="flex flex-col gap-3">
              {appointments.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {appointments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 rounded-(--radius-300) bg-(--bg-surface-info) px-3 py-2"
                    >
                      <CalendarClock aria-hidden className="size-4 shrink-0 text-(--text-info)" />
                      <span className="body-md min-w-0 flex-1">
                        <span className="font-semibold">{APPOINTMENT_TYPE_LABELS[a.appointmentType ?? "viewing"]}</span>
                        {" · "}
                        {formatDate(a.date)}, {a.time.slice(0, 5)}
                      </span>
                      <span className="body-sm text-(--text-secondary)">{APPOINTMENT_STATUS[a.status]}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <TextField
                label="New note"
                labelHidden
                multiline={2}
                value={note}
                onChange={setNote}
                placeholder="Add a note, e.g. offered £500 off for a deposit this week"
              />
              <div className="flex justify-end">
                <Button onClick={() => void addNote()} loading={savingNote} disabled={!note.trim()}>
                  Add note
                </Button>
              </div>
              <ul className="flex flex-col">
                {[...notes].reverse().map((n) => {
                  const author = users.find((u) => u.id === n.userId)?.name ?? "Unknown";
                  return (
                    <li key={n.id} className="flex gap-3 py-2">
                      <Avatar size="sm" name={author} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="body-md-semibold">{author}</span>
                          <span className="body-sm tabular-nums text-(--text-secondary)">
                            {formatDateTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="body-md whitespace-pre-wrap text-pretty">{n.content}</p>
                      </div>
                    </li>
                  );
                })}
                {/* What was said when the lead was taken, oldest of all. */}
                {lead?.notes?.trim() ? (
                  <li className="flex gap-3 py-2">
                    <Avatar size="sm" name={users.find((u) => u.id === lead.assignedTo)?.name ?? "Lead"} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="body-md-semibold">With the lead</span>
                        <span className="body-sm tabular-nums text-(--text-secondary)">
                          {formatDateTime(lead.createdAt)}
                        </span>
                      </div>
                      <p className="body-md whitespace-pre-wrap text-pretty">{lead.notes.trim()}</p>
                    </div>
                  </li>
                ) : null}
              </ul>
            </div>
          </Card>
        </div>
      </div>

      <QuickBookModal
        booking={booking ? { kind: "appt", deal } : null}
        vehicles={swappable}
        onClose={() => setBooking(false)}
        onBooked={() => void load()}
      />
      <CompleteSaleModal
        open={selling !== null}
        customerName={deal.customerName}
        vehicle={vehicle}
        stageLabel={(selling && stageOf.get(selling)?.label) || "Completed sale"}
        defaultPrice={deal.agreedPrice ?? deal.offerPrice ?? vehicle?.sellingPrice ?? vehicle?.listingPrice ?? null}
        defaultSource={vehicle?.sellingAgent || enquirySourceForChannel(channel)}
        sourceOptions={enquirySourceOptions(data.vehicles.map((v) => v.sellingAgent), vehicle?.sellingAgent)}
        onClose={() => setSelling(null)}
        onConfirm={completeSale}
      />
      <DealParticularsModal
        open={editing}
        customerName={deal.customerName}
        value={particulars}
        onClose={() => setEditing(false)}
        onSave={saveParticulars}
      />
      <ChangeVehicleModal
        open={swapping}
        onClose={() => setSwapping(false)}
        customerName={deal.customerName}
        current={vehicle}
        vehicles={swappable}
        onSave={changeVehicle}
      />
      {confirmDialog}
    </Page>
  );
}
