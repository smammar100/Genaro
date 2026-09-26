"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { appointmentService } from "@/lib/services/appointment-service";
import { workshopService } from "@/lib/services/workshop-service";
import { maintenanceService } from "@/lib/services/maintenance-service";
import { vehicleService } from "@/lib/services/vehicle-service";
import type { Appointment, MaintenanceJob, UUID, Vehicle, WorkshopJob } from "@/lib/types";
import { Card, SkeletonBodyText, SkeletonDisplayText } from "@/components/polaris";
import {
  ALL_KINDS,
  buildEvents,
  daysInView,
  decToHm,
  hmToDec,
  resolveHours,
  stepAnchor,
  toISO,
  viewLabel,
  weekOf,
  type CalEvent,
  type Kind,
  type ViewKey,
} from "@/lib/calendar-model";
import { notify } from "@/lib/toast";
import { CalendarFilters, CalendarToolbar } from "./calendar-toolbar";
import { EventFormModal, EMPTY_FIELDS, fieldsForEvent, type FormFields } from "./event-form-modal";
import { KIND_META } from "./event-meta";
import { EventPopover } from "./event-popover";
import { MonthGrid } from "./month-grid";
import { TimeGrid } from "./time-grid";

/**
 * SharedCalendar is the calendar behind the Master calendar (all three sources)
 * and the scoped calendars (Maintenance, Sales appointments). It overlays
 * appointments (blue), workshop walk-ins (amber) and maintenance (purple)
 * across day, week and month views. Click a free slot to book, click an event
 * for its details, then edit it or mark a job done. `kinds` scopes the
 * sources; `ctaLabel` and `lockCreateKind` tune the create action. Records are
 * deleted from their own module pages.
 */

// Minimum hour-row heights. Rows grow to fill the card and scroll below these.
const WEEK_HOUR_PX = 48;
const DAY_HOUR_PX = 64;

interface Sources {
  appts: Appointment[];
  shop: WorkshopJob[];
  maint: MaintenanceJob[];
  vehicles: Vehicle[];
}

async function fetchSources(companyId: UUID, kinds: Kind[]): Promise<Sources> {
  const [appts, shop, maint, vehicles] = await Promise.all([
    kinds.includes("appt") ? appointmentService.getAll(companyId) : Promise.resolve([]),
    kinds.includes("workshop") ? workshopService.getAll(companyId) : Promise.resolve([]),
    kinds.includes("maint") ? maintenanceService.getAll(companyId) : Promise.resolve([]),
    vehicleService.getAll(companyId),
  ]);
  return { appts, shop, maint, vehicles };
}

type FormState =
  | { mode: "create"; initial: FormFields }
  | { mode: "edit"; ev: CalEvent }
  | null;

interface SharedCalendarProps {
  /** Which sources to load and show. Defaults to all three. */
  kinds?: Kind[];
  /** Label for the primary create button. */
  ctaLabel?: string;
  /** Lock the kind in the create form (single-source calendars). */
  lockCreateKind?: boolean;
}

export function SharedCalendar({
  kinds: kindsProp = ALL_KINDS,
  ctaLabel = "New event",
  lockCreateKind = false,
}: SharedCalendarProps) {
  const { company, user } = useAuth();
  // Pages pass `kinds` inline; key on its contents so a re-render of the page
  // doesn't refetch everything.
  const kindsKey = kindsProp.join(",");
  const kinds = useMemo(() => kindsKey.split(",") as Kind[], [kindsKey]);
  const hours = useMemo(() => resolveHours(company), [company]);

  const [sources, setSources] = useState<Sources | null>(null);
  const [view, setView] = useState<ViewKey>("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [active, setActive] = useState<Set<Kind>>(() => new Set(kinds));
  const [opened, setOpened] = useState<{ ev: CalEvent; anchor: HTMLElement } | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const reloadAll = useCallback(
    async (companyId: UUID): Promise<void> => setSources(await fetchSources(companyId, kinds)),
    [kinds],
  );

  useEffect(() => {
    if (!company) return;
    let live = true;
    fetchSources(company.id, kinds)
      .then((s) => {
        if (live) setSources(s);
      })
      .catch((e: unknown) => {
        if (!live) return;
        notify.error(e instanceof Error ? e.message : "Couldn't load the calendar");
        setSources({ appts: [], shop: [], maint: [], vehicles: [] });
      });
    return () => {
      live = false;
    };
  }, [company, kinds]);

  // The clock starts after mount, so the server and first client render agree.
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const every = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, []);

  const events = useMemo(() => (sources ? buildEvents(sources) : []), [sources]);
  const shown = useMemo(() => events.filter((e) => active.has(e.kind)), [events, active]);
  const counts = useMemo(() => {
    const inView = new Set(daysInView(view, anchor).map(toISO));
    const out: Record<Kind, number> = { appt: 0, workshop: 0, maint: 0 };
    for (const e of events) if (inView.has(e.date)) out[e.kind] += 1;
    return out;
  }, [events, view, anchor]);

  const todayISO = now ? toISO(now) : "";
  const nowHour = now ? now.getHours() + now.getMinutes() / 60 : null;
  const defaultKind: Kind = kinds[0] ?? "appt";

  const closePopover = useCallback(() => setOpened(null), []);
  const openEvent = useCallback((ev: CalEvent, el: HTMLElement) => {
    setOpened((cur) => (cur?.ev.key === ev.key ? null : { ev, anchor: el }));
  }, []);
  const openDay = (d: Date) => {
    setOpened(null);
    setAnchor(d);
    setView("day");
  };
  const changeView = (v: ViewKey) => {
    setOpened(null);
    setView(v);
  };
  const step = (dir: -1 | 1) => {
    setOpened(null);
    setAnchor((a) => stepAnchor(view, a, dir));
  };
  const goToday = () => {
    setOpened(null);
    setAnchor(new Date());
  };
  const openCreate = (date: string, time: string) => {
    setOpened(null);
    setForm({ mode: "create", initial: { ...EMPTY_FIELDS, kind: defaultKind, date, time } });
  };

  /** Calendar shortcuts: T today, D / W / M views, arrows to move. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (e.metaKey || e.ctrlKey || e.altKey || form) return;
    // Portalled popovers bubble here through React; only react to the grid.
    if (!e.currentTarget.contains(target)) return;
    if (target.closest("input, textarea, select, [contenteditable]")) return;
    const key = e.key.toLowerCase();
    if (key === "t") goToday();
    else if (key === "d") changeView("day");
    else if (key === "w") changeView("week");
    else if (key === "m") changeView("month");
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else return;
    e.preventDefault();
  };

  async function handleSubmit(fields: FormFields): Promise<void> {
    if (!company || !user || saving || !form) return;
    setSaving(true);
    // The success message waits for the reload, so a failed reload can't
    // flash "saved" over stale data.
    let message = "";
    try {
      if (form.mode === "create") {
        if (fields.kind === "appt") {
          await appointmentService.create({
            companyId: company.id,
            vehicleId: fields.vehicleId,
            leadId: null,
            customerName: fields.customerName.trim(),
            customerPhone: fields.customerPhone.trim(),
            customerEmail: fields.customerEmail.trim(),
            date: fields.date,
            time: fields.time,
            specialRequirements: fields.notes.trim() || null,
            createdBy: user.id,
          });
        } else if (fields.kind === "workshop") {
          // Walk-ins aren't linked to stock: workshop_jobs has no vehicle_id.
          await workshopService.create(
            {
              companyId: company.id,
              customerName: fields.customerName.trim(),
              customerPhone: fields.customerPhone.trim(),
              vehicleReg: fields.vehicleReg.trim(),
              vehicleDescription: fields.vehicleDescription.trim(),
              description: fields.description.trim(),
              assignedTo: null,
              estimatedCost: null,
              scheduledDate: fields.date,
              scheduledTime: fields.time,
              notes: fields.notes.trim() || null,
            },
            user.id,
          );
        } else {
          // A calendar-made job is a stub: vendor, assignee, costs and duration
          // are filled in later from the Maintenance pipeline. It starts on its
          // due date so it's schedulable straight away.
          await maintenanceService.create(
            {
              companyId: company.id,
              vehicleId: fields.vehicleId,
              description: fields.description.trim(),
              assignedTo: null,
              vendorId: null,
              estimatedCost: null,
              estimatedDurationHours: null,
              startDate: fields.date,
              dueDate: fields.date,
              scheduledTime: fields.time || null,
              notes: fields.notes.trim() || null,
            },
            user.id,
          );
        }
        message = `${KIND_META[fields.kind].singular} added`;
      } else {
        const ev = form.ev;
        if (ev.kind === "appt") {
          await appointmentService.update(
            ev.id,
            {
              customerName: fields.customerName.trim(),
              customerPhone: fields.customerPhone.trim(),
              customerEmail: fields.customerEmail.trim(),
              vehicleId: fields.vehicleId,
              date: fields.date,
              time: fields.time,
              specialRequirements: fields.notes.trim() || null,
            },
            user.id,
          );
        } else if (ev.kind === "workshop") {
          await workshopService.update(ev.id, {
            customerName: fields.customerName.trim(),
            customerPhone: fields.customerPhone.trim(),
            vehicleReg: fields.vehicleReg.trim(),
            vehicleDescription: fields.vehicleDescription.trim(),
            description: fields.description.trim(),
            scheduledDate: fields.date,
            scheduledTime: fields.time,
            notes: fields.notes.trim() || null,
          });
        } else {
          // Stored times carry seconds; only send the time when it changed, so
          // an untouched save doesn't log a "Job updated" note.
          const timeChanged = (ev.raw.scheduledTime ?? "").slice(0, 5) !== fields.time;
          await maintenanceService.update(
            ev.id,
            {
              vehicleId: fields.vehicleId,
              description: fields.description.trim(),
              dueDate: fields.date,
              ...(timeChanged ? { scheduledTime: fields.time || null } : {}),
              notes: fields.notes.trim() || null,
            },
            user.id,
          );
        }
        message = "Changes saved";
      }
      await reloadAll(company.id);
      setForm(null);
      notify.success(message);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function markDone(ev: CalEvent): Promise<void> {
    if (!company || !user || busy || ev.kind === "appt") return;
    setBusy(true);
    try {
      if (ev.kind === "workshop") await workshopService.updateStatus(ev.id, "completed");
      else await maintenanceService.updateStatus(ev.id, "completed", user.id);
      await reloadAll(company.id);
      setOpened(null);
      notify.success(`${KIND_META[ev.kind].singular} marked as done`);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Couldn't update the job");
    } finally {
      setBusy(false);
    }
  }

  if (!sources) {
    return (
      <Card padding="0" className="h-[calc(100dvh-230px)] min-h-[560px]">
        <div className="flex items-center gap-3 border-b border-(--border-secondary) px-4 py-4">
          <div className="w-48">
            <SkeletonDisplayText size="small" />
          </div>
        </div>
        <div className="p-4">
          <SkeletonBodyText lines={12} />
        </div>
      </Card>
    );
  }

  const draft =
    form?.mode === "create" && form.initial.time
      ? { date: form.initial.date, hour: hmToDec(form.initial.time) }
      : null;
  const selectedKey = opened?.ev.key ?? null;

  return (
    <>
      <Card padding="0" className="h-[calc(100dvh-230px)] min-h-[560px]">
        <div className="flex h-full min-h-0 flex-col outline-none" tabIndex={-1} onKeyDown={onKeyDown}>
          <CalendarToolbar
            label={viewLabel(view, anchor)}
            view={view}
            isToday={toISO(anchor) === todayISO}
            ctaLabel={ctaLabel}
            onToday={goToday}
            onStep={step}
            onView={changeView}
            onCreate={() => openCreate(toISO(view === "month" ? new Date() : anchor), decToHm(Math.ceil(hours.open)))}
          />
          <CalendarFilters
            kinds={kinds}
            active={active}
            counts={counts}
            hours={hours}
            onToggle={(k) =>
              setActive((prev) => {
                const next = new Set(prev);
                if (next.has(k)) next.delete(k);
                else next.add(k);
                return next;
              })
            }
          />
          {view === "month" ? (
            <MonthGrid
              anchor={anchor}
              events={shown}
              todayISO={todayISO}
              nowHour={nowHour}
              selectedKey={selectedKey}
              onOpenDay={openDay}
              onOpenEvent={openEvent}
            />
          ) : (
            <TimeGrid
              days={view === "day" ? [anchor] : weekOf(anchor)}
              events={shown}
              hours={hours}
              hourPx={view === "day" ? DAY_HOUR_PX : WEEK_HOUR_PX}
              todayISO={todayISO}
              nowHour={nowHour}
              selectedKey={selectedKey}
              draft={draft}
              onOpenDay={openDay}
              onOpenEvent={openEvent}
              onCreateAt={(date, hour) => openCreate(date, decToHm(hour))}
            />
          )}
        </div>
      </Card>

      {opened ? (
        <EventPopover
          ev={opened.ev}
          anchor={opened.anchor}
          busy={busy}
          onClose={closePopover}
          onEdit={(ev) => {
            setOpened(null);
            setForm({ mode: "edit", ev });
          }}
          onMarkDone={(ev) => void markDone(ev)}
        />
      ) : null}

      {form ? (
        <EventFormModal
          key={form.mode === "edit" ? form.ev.key : `new-${form.initial.date}-${form.initial.time}`}
          heading={form.mode === "edit" ? `Edit ${KIND_META[form.ev.kind].singular.toLowerCase()}` : ctaLabel}
          submitLabel={form.mode === "edit" ? "Save" : ctaLabel === "New event" ? "Add event" : ctaLabel}
          initial={form.mode === "edit" ? fieldsForEvent(form.ev) : form.initial}
          kinds={kinds}
          showKindPicker={form.mode === "create" && !lockCreateKind && kinds.length > 1}
          vehicles={sources.vehicles}
          hours={hours}
          saving={saving}
          onClose={() => setForm(null)}
          onSubmit={(fields) => void handleSubmit(fields)}
        />
      ) : null}
    </>
  );
}
