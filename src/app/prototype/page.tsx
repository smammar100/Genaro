"use client";

/**
 * Prototype page (see .claude/skills/prototype). Current feature: the shared
 * calendar (Master calendar, Maintenance calendar, Sales appointments) — five
 * variations grounded in Mobbin references (Amie, Cron / Notion Calendar,
 * Square, Fresha, Google), built with the Polaris kit. Every variation has
 * working Day / Week / Month views, Today and prev/next, type filters with
 * counts, all-day maintenance-due items, the current-time line, clicking a
 * free slot to start a booking and opening an event. Presentational only.
 */
import * as React from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, GripVertical, MapPin, Phone, Plus, Sparkles, User, Wrench, X } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  EmptyState,
  KeyboardKey,
  Page,
  SkeletonBodyText,
  TextField,
  type BadgeTone,
} from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";

/* ── Dates ─────────────────────────────────────────────────────────── */

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WD_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MO = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const wd = (d: Date) => (d.getDay() + 6) % 7; // Monday = 0
const weekStart = (d: Date) => addDays(d, -wd(d));
const weekDays = (d: Date) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(d), i));
function monthGrid(d: Date) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((wd(first) + days) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(weekStart(first), i));
}
const short = (d: Date) => `${WD[wd(d)]} ${d.getDate()} ${MO[d.getMonth()].slice(0, 3)}`;

const TODAY = new Date(2026, 8, 26); // Sat 26 Sep 2026
const TODAY_KEY = toKey(TODAY);
const isToday = (d: Date) => toKey(d) === TODAY_KEY;
const NOW = 12.4; // 12:24
const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 8:00 – 18:00
const H = 64; // px per hour
const hh = (t: number) => `${Math.floor(t)}:${pad(Math.round((t % 1) * 60))}`;

/* ── Sample data ───────────────────────────────────────────────────── */

type Kind = "appointment" | "workshop" | "maintenance";
type Ev = { id: string; kind: Kind; date: string; start: number; end: number; title: string; reg: string; car: string; who?: string; status?: string };
type AllDay = { id: string; date: string; reg: string; text: string; car: string };

const sep = (d: number) => `2026-09-${pad(d)}`;
const oct = (d: number) => `2026-10-${pad(d)}`;
const ev = (id: string, kind: Kind, date: string, start: number, end: number, title: string, reg: string, car: string, who: string, status?: string): Ev => ({ id, kind, date, start, end, title, reg, car, who, status });

const EVENTS: Ev[] = [
  ev("1", "appointment", sep(26), 11, 12, "Hina Mockford", "RK69 KRT", "BMW X1", "Test drive", "Confirmed"),
  ev("2", "workshop", sep(26), 9, 9.5, "Nadia Testwell", "AB12 CDE", "Ford Fiesta 1.0", "Walk-in · brake noise"),
  ev("3", "workshop", sep(26), 10.5, 11, "Oscar Mockford", "EF34 GHJ", "Vauxhall Corsa 1.2", "Walk-in · MOT"),
  ev("4", "maintenance", sep(26), 9.5, 10, "Full service + oil & filter", "RK67 HJD", "Land Rover Discovery Sport", "Southall Motors"),
  ev("5", "maintenance", sep(26), 11, 11.5, "Alloy wheel refurbishment (x2)", "WF16 UKX", "BMW 3 Series", "Ace Bodyshop"),
  ev("6", "appointment", sep(26), 14, 14.5, "Omar Testwell", "GK66 ERT", "BMW X1", "Viewing", "Pending"),
  ev("7", "appointment", sep(22), 10, 11, "James Carter", "LT17 NKX", "Audi A3", "Handover", "Confirmed"),
  ev("8", "workshop", sep(23), 13, 14, "Zara Ahmed", "PK18 KKX", "BMW 3 Series", "Walk-in · tyres"),
  ev("9", "maintenance", sep(24), 9, 12, "Bodywork: rear bumper", "PK70 RPL", "Nissan Serena", "Ace Bodyshop"),
  ev("10", "appointment", sep(25), 15, 16, "Usman Ali", "WF69 TYU", "Nissan Leaf", "Test drive", "No-show"),
  ev("11", "appointment", sep(1), 10, 11, "Priya Shah", "LV19 PXA", "Toyota Yaris Hybrid", "Test drive", "Confirmed"),
  ev("12", "maintenance", sep(2), 9, 13, "MOT + service", "YH17 ZRT", "Kia Sportage", "Southall Motors"),
  ev("13", "workshop", sep(3), 14, 15, "Tom Fletcher", "BD65 WQE", "VW Golf 1.4", "Walk-in · clutch"),
  ev("14", "appointment", sep(5), 11, 11.5, "Aisha Khan", "KM68 LOP", "Mercedes A-Class", "Viewing", "Confirmed"),
  ev("15", "appointment", sep(7), 15, 16, "Liam O'Neill", "RX16 TTB", "Honda Civic", "Handover", "Confirmed"),
  ev("16", "workshop", sep(8), 9, 10, "Sofia Rossi", "HN18 YUP", "Peugeot 208", "Walk-in · diagnostics"),
  ev("17", "maintenance", sep(9), 10, 12, "Tyres x4 + alignment", "LT67 VJD", "Ford Fiesta", "Hounslow Tyres"),
  ev("18", "appointment", sep(10), 12, 13, "Daniel Park", "SN20 KLM", "Skoda Octavia", "Test drive", "No-show"),
  ev("19", "appointment", sep(12), 10, 10.5, "Grace Mensah", "GF21 WEA", "Hyundai Tucson", "Viewing", "Confirmed"),
  ev("20", "appointment", sep(12), 13, 14, "Ben Walker", "PL15 ORB", "Mini Cooper", "Test drive", "Confirmed"),
  ev("21", "maintenance", sep(14), 9, 11, "Cambelt replacement", "MA66 KPE", "Audi A4", "Southall Motors"),
  ev("22", "workshop", sep(15), 11, 12, "Fatima Noor", "DS17 HHB", "Nissan Qashqai", "Walk-in · air con"),
  ev("23", "appointment", sep(16), 14, 15, "Chris Hale", "WR19 LZX", "Tesla Model 3", "Test drive", "Confirmed"),
  ev("24", "appointment", sep(17), 10, 11, "Mei Chen", "EA20 PRV", "Kia Niro", "Handover", "Confirmed"),
  ev("25", "maintenance", sep(17), 13, 15, "Paint correction", "RK67 HJD", "Land Rover Discovery Sport", "Ace Bodyshop"),
  ev("26", "workshop", sep(18), 9.5, 10.5, "Ravi Patel", "BK64 MNO", "Ford Focus", "Walk-in · exhaust"),
  ev("27", "appointment", sep(19), 11, 12, "Hannah Lee", "YT18 CVB", "Volvo XC40", "Test drive", "Pending"),
  ev("28", "appointment", sep(19), 12, 12.5, "Imran Butt", "LC20 WSD", "Audi Q3", "Viewing", "Confirmed"),
  ev("29", "workshop", sep(19), 15, 16, "Jack Turner", "GN17 BVC", "Vauxhall Astra", "Walk-in · suspension"),
  ev("30", "appointment", sep(28), 10, 11, "Leah Morgan", "MX70 DFG", "Seat Leon", "Test drive", "Confirmed"),
  ev("31", "maintenance", sep(29), 9, 12, "Windscreen replacement", "WF16 UKX", "BMW 3 Series", "Southall Glass"),
  ev("32", "workshop", sep(30), 14, 15, "Kofi Owusu", "LN19 AAE", "Toyota Corolla", "Walk-in · battery"),
  ev("33", "appointment", oct(1), 11, 12, "Ella Brooks", "SK21 JJU", "Renault Clio", "Handover", "Confirmed"),
  ev("34", "appointment", oct(2), 16, 17, "Adam Novak", "KR17 TTL", "Mazda CX-5", "Viewing", "Pending"),
];
const ALL_DAY: AllDay[] = [
  { id: "a1", date: sep(26), reg: "LT67 VJD", text: "Needs a new battery", car: "Ford Fiesta" },
  { id: "a2", date: sep(26), reg: "WF66 NYU", text: "Key battery low", car: "Audi A3" },
  { id: "a3", date: sep(15), reg: "MA66 KPE", text: "MOT due", car: "Audi A4" },
  { id: "a4", date: sep(30), reg: "YH17 ZRT", text: "Road tax due", car: "Kia Sportage" },
];

const KINDS: { kind: Kind; label: string; one: string; dot: string; block: string; bar: string; text: string }[] = [
  { kind: "appointment", label: "Appointments", one: "Appointment", dot: "bg-(--bg-fill-info)", block: "bg-(--bg-surface-info) border-(--border-info)", bar: "border-(--border-info)", text: "text-(--text-info)" },
  { kind: "workshop", label: "Workshop", one: "Workshop job", dot: "bg-(--bg-fill-caution)", block: "bg-(--bg-surface-caution) border-(--border-caution)", bar: "border-(--border-caution)", text: "text-(--text-caution)" },
  { kind: "maintenance", label: "Maintenance", one: "Maintenance", dot: "bg-(--bg-fill-magic)", block: "bg-(--bg-surface-magic) border-(--border-magic)", bar: "border-(--border-magic)", text: "text-(--text-magic)" },
];
const kindOf = (k: Kind) => KINDS.find((x) => x.kind === k)!;
const STATUS_TONE: Record<string, BadgeTone> = { Confirmed: "success", Pending: "attention", "No-show": "critical" };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ── Calendar state: view, date cursor, slot draft ─────────────────── */

type View = "day" | "week" | "month";
type Draft = { col: string; date: string; start: number };

function rangeLabel(view: View, c: Date) {
  if (view === "day") return `${WD_LONG[wd(c)]} ${c.getDate()} ${MO[c.getMonth()]}`;
  if (view === "month") return `${MO[c.getMonth()]} ${c.getFullYear()}`;
  const [a, b] = [weekStart(c), addDays(weekStart(c), 6)];
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} ${MO[b.getMonth()]}`
    : `${a.getDate()} ${MO[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MO[b.getMonth()].slice(0, 3)}`;
}

function visibleDays(view: View, c: Date) {
  return view === "day" ? [c] : view === "week" ? weekDays(c) : monthGrid(c).filter((d) => d.getMonth() === c.getMonth());
}

function useCalendar(initial: View = "week") {
  const [view, setView] = React.useState<View>(initial);
  const [cursor, setCursor] = React.useState(TODAY);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const step = (dir: number) =>
    setCursor((c) => (view === "day" ? addDays(c, dir) : view === "week" ? addDays(c, 7 * dir) : new Date(c.getFullYear(), c.getMonth() + dir, 1)));
  const goToday = () => setCursor(TODAY);
  const openDay = (d: Date) => {
    setCursor(d);
    setView("day");
  };
  /** Cron-style shortcuts: T today, D / W / M views, arrows to move. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("input, textarea, select")) return;
    const k = e.key.toLowerCase();
    if (k === "t") goToday();
    else if (k === "d" || k === "w" || k === "m") setView(k === "d" ? "day" : k === "w" ? "week" : "month");
    else if (e.key === "ArrowLeft" || k === "j") step(-1);
    else if (e.key === "ArrowRight" || k === "k") step(1);
    else if (e.key === "Escape") setDraft(null);
    else return;
    e.preventDefault();
  };
  return { view, setView, cursor, setCursor, step, goToday, openDay, draft, setDraft, onKeyDown, label: rangeLabel(view, cursor), days: visibleDays(view, cursor) };
}
type Cal = ReturnType<typeof useCalendar>;

/** Type filters, shared by the chips and the checkbox list. */
function useKinds() {
  const [shown, setShown] = React.useState<Set<Kind>>(() => new Set(KINDS.map((k) => k.kind)));
  const toggle = (k: Kind) =>
    setShown((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  return { shown, toggle };
}
type Kinds = ReturnType<typeof useKinds>;

const inDays = (days: Date[]) => {
  const keys = new Set(days.map(toKey));
  return (x: { date: string }) => keys.has(x.date);
};

/* ── Controls ──────────────────────────────────────────────────────── */

function ViewSwitch({ cal }: { cal: Cal }) {
  return (
    <ButtonGroup variant="segmented">
      {(["day", "week", "month"] as View[]).map((v) => (
        <Button key={v} pressed={cal.view === v} onClick={() => cal.setView(v)}>
          {v[0].toUpperCase() + v.slice(1)}
        </Button>
      ))}
    </ButtonGroup>
  );
}

function StepButtons({ cal, vertical = false }: { cal: Cal; vertical?: boolean }) {
  return (
    <ButtonGroup gap="tight">
      <Button variant="tertiary" icon={vertical ? <ChevronUp className="size-4" /> : <ChevronLeft className="size-4" />} accessibilityLabel={`Previous ${cal.view}`} onClick={() => cal.step(-1)} />
      <Button variant="tertiary" icon={vertical ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />} accessibilityLabel={`Next ${cal.view}`} onClick={() => cal.step(1)} />
    </ButtonGroup>
  );
}

function newEvent(cal: Cal) {
  const date = cal.view === "month" ? TODAY : cal.cursor;
  if (cal.view === "month") cal.openDay(TODAY);
  cal.setDraft({ col: toKey(date), date: toKey(date), start: 15 });
}

function Toolbar({ cal, extra }: { cal: Cal; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-(--border-secondary) px-4 py-3">
      <Button onClick={cal.goToday}>Today</Button>
      <StepButtons cal={cal} />
      <h2 className="heading-sm">{cal.label}</h2>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {extra}
        <ViewSwitch cal={cal} />
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => newEvent(cal)}>New event</Button>
      </div>
    </div>
  );
}

function FilterChips({ kinds, events }: { kinds: Kinds; events: Ev[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {KINDS.map((k) => {
        const on = kinds.shown.has(k.kind);
        return (
          <button
            key={k.kind}
            type="button"
            aria-pressed={on}
            onClick={() => kinds.toggle(k.kind)}
            className={`inline-flex items-center gap-1.5 rounded-(--radius-full) border px-3 py-1 body-sm hover:bg-(--bg-surface-hover) ${on ? "border-(--border) bg-(--bg-surface)" : "border-dashed border-(--border-secondary) text-(--text-secondary)"}`}
          >
            <span className={`size-2 rounded-full ${on ? k.dot : "bg-(--bg-fill-disabled)"}`} />
            {k.label}
            <span className="text-(--text-secondary)">{events.filter((e) => e.kind === k.kind).length}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Time grid (Day and Week) ──────────────────────────────────────── */

type GridCol = { key: string; date: Date; header: React.ReactNode; events: Ev[]; allDay: AllDay[] };
type Pick = (e: Ev, rect: DOMRect) => void;

function layoutLanes(events: Ev[]) {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: { e: Ev; lane: number; lanes: number }[] = [];
  let cluster: { e: Ev; lane: number }[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    cluster.forEach((c) => out.push({ ...c, lanes }));
    cluster = [];
  };
  for (const e of sorted) {
    if (e.start >= clusterEnd && cluster.length) flush();
    const taken = new Set(cluster.filter((c) => c.e.end > e.start).map((c) => c.lane));
    let lane = 0;
    while (taken.has(lane)) lane++;
    cluster.push({ e, lane });
    clusterEnd = Math.max(clusterEnd, e.end);
  }
  if (cluster.length) flush();
  return out;
}

function Block({ e, lane, lanes, selected, detail, onPick }: { e: Ev; lane: number; lanes: number; selected: boolean; detail: boolean; onPick?: Pick }) {
  const k = kindOf(e.kind);
  const past = e.date < TODAY_KEY || (e.date === TODAY_KEY && e.end <= NOW);
  return (
    <button
      type="button"
      onClick={(ev) => onPick?.(e, ev.currentTarget.getBoundingClientRect())}
      className={`absolute z-[1] overflow-hidden rounded-(--radius-200) border-l-4 px-2 py-1 text-left hover:shadow-(--shadow-200) ${k.block} ${past ? "opacity-60" : ""} ${selected ? "outline-2 outline-(--border-focus)" : ""}`}
      style={{ top: (e.start - 8) * H + 2, height: (e.end - e.start) * H - 4, left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)` }}
    >
      {e.end - e.start <= 0.5 ? (
        <p className="truncate body-sm"><span className={k.text}>{hh(e.start)}</span> <span className="body-md-semibold">{e.title}</span></p>
      ) : (
        <>
          <p className="truncate body-md-semibold">{e.title}</p>
          <p className={`truncate body-sm ${k.text}`}>{`${hh(e.start)} – ${hh(e.end)}`}</p>
          {detail && <p className="truncate body-sm text-(--text-secondary)">{`${e.reg} · ${e.car}`}</p>}
        </>
      )}
    </button>
  );
}

function TimeGutter({ nowPill }: { nowPill: boolean }) {
  return (
    <div className="relative w-14 shrink-0">
      {HOURS.map((h) => (
        <div key={h} className="relative" style={{ height: H }}>
          <span className="absolute -top-2 right-2 body-sm text-(--text-secondary)">{`${h}:00`}</span>
        </div>
      ))}
      {nowPill && (
        <span className="absolute right-1 z-[2] -translate-y-1/2 rounded-(--radius-100) bg-(--bg-fill-critical) px-1 body-sm text-(--text-critical-on-bg-fill)" style={{ top: (NOW - 8) * H }}>
          {hh(NOW)}
        </span>
      )}
    </div>
  );
}

function GridColumn({ col, cal, onPick, selected, detail, closedHours, hatched, nowDot = true, onDropItem }: {
  col: GridCol; cal: Cal; onPick?: Pick; selected?: string; detail: boolean; closedHours?: boolean; hatched?: boolean; nowDot?: boolean;
  onDropItem?: (id: string, date: Date, hour: number) => void;
}) {
  const draft = cal.draft?.col === col.key ? cal.draft : null;
  return (
    <div className="relative min-w-0 flex-1 border-l border-(--border-secondary)" style={{ height: HOURS.length * H }}>
      {hatched && <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--bg-surface-secondary)_6px_12px)]" />}
      {HOURS.map((h, i) => (
        <button
          key={h}
          type="button"
          aria-label={`Book ${short(col.date)} at ${h}:00`}
          onClick={() => cal.setDraft({ col: col.key, date: toKey(col.date), start: h })}
          onDragOver={(e) => onDropItem && e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onDropItem?.(e.dataTransfer.getData("text/plain"), col.date, h);
          }}
          className={`relative block w-full hover:bg-(--bg-surface-hover) ${i ? "border-t border-(--border-secondary)" : ""} ${closedHours && (h < 9 || h >= 17) ? "bg-(--bg-surface-secondary)" : ""}`}
          style={{ height: H }}
        />
      ))}
      {layoutLanes(col.events).map(({ e, lane, lanes }) => (
        <Block key={e.id} e={e} lane={lane} lanes={lanes} detail={detail} selected={selected === e.id} onPick={onPick} />
      ))}
      {draft && (
        <div className="absolute inset-x-1 z-[3] flex items-start justify-between gap-1 rounded-(--radius-200) border-2 border-dashed border-(--border-focus) bg-(--bg-surface-selected) px-2 py-1 shadow-(--shadow-300)" style={{ top: (draft.start - 8) * H + 2, height: H - 4 }}>
          <span className="min-w-0">
            <span className="block truncate body-md-semibold">New event</span>
            <span className="block truncate body-sm text-(--text-secondary)">{`${hh(draft.start)} – ${hh(draft.start + 1)}`}</span>
          </span>
          <button type="button" aria-label="Discard new event" onClick={() => cal.setDraft(null)} className="rounded-(--radius-100) p-0.5 hover:bg-(--bg-surface-hover)"><X className="size-3.5" /></button>
        </div>
      )}
      {isToday(col.date) && (
        <div className="pointer-events-none absolute inset-x-0 z-[2]" style={{ top: (NOW - 8) * H }}>
          <div className="relative h-0.5 bg-(--bg-fill-critical)">{nowDot && <span className="absolute -left-1 -top-1 size-2.5 rounded-full bg-(--bg-fill-critical)" />}</div>
        </div>
      )}
    </div>
  );
}

function AllDayChip({ a, compact }: { a: AllDay; compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 rounded-(--radius-100) bg-(--bg-surface-magic) px-1.5 py-0.5 body-sm text-(--text-magic)" title={`${a.text} · ${a.reg}`}>
      <Wrench className="size-3 shrink-0" />
      <span className="truncate">{compact ? a.text : `${a.text} · ${a.reg}`}</span>
    </span>
  );
}

function TimeGrid({ cal, cols, onPick, selected, closedHours, hatchSunday, onDropItem, maxHeight = 480 }: {
  cal: Cal; cols: GridCol[]; onPick?: Pick; selected?: string; closedHours?: boolean; hatchSunday?: boolean;
  onDropItem?: (id: string, date: Date, hour: number) => void; maxHeight?: number;
}) {
  const hasAllDay = cols.some((c) => c.allDay.length);
  return (
    <div className="overflow-x-auto">
      <div className={cols.length > 3 ? "min-w-[760px]" : ""}>
        <div className="flex border-b border-(--border-secondary)">
          <div className="w-14 shrink-0" />
          {cols.map((c) => <div key={c.key} className="min-w-0 flex-1 border-l border-(--border-secondary)">{c.header}</div>)}
        </div>
        {hasAllDay && (
          <div className="flex border-b border-(--border-secondary)">
            <span className="w-14 shrink-0 py-1 pr-2 text-right body-sm text-(--text-secondary)">All day</span>
            {cols.map((c) => (
              <div key={c.key} className="flex min-w-0 flex-1 flex-col gap-1 border-l border-(--border-secondary) p-1">
                {c.allDay.map((a) => <AllDayChip key={a.id} a={a} compact={cols.length > 3} />)}
              </div>
            ))}
          </div>
        )}
        <div className="flex overflow-y-auto pt-2" style={{ maxHeight }}>
          <TimeGutter nowPill={cols.some((c) => isToday(c.date))} />
          {cols.map((c, i) => (
            <GridColumn key={c.key} col={c} cal={cal} onPick={onPick} selected={selected} detail={cols.length <= 3} closedHours={closedHours} hatched={hatchSunday && wd(c.date) === 6} nowDot={i === 0 || !isToday(cols[i - 1].date)} onDropItem={onDropItem} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Day header, Amie / Cron style: weekday over the date; today in a filled pill. Opens the day. */
function DayHeader({ d, cal, align = "center" }: { d: Date; cal: Cal; align?: "center" | "start" }) {
  return (
    <button type="button" onClick={() => cal.openDay(d)} className={`flex w-full items-center gap-1.5 px-2 py-2 hover:bg-(--bg-surface-hover) ${align === "center" ? "justify-center" : ""} ${wd(d) === 6 ? "text-(--text-secondary)" : ""}`}>
      <span className="body-sm">{WD[wd(d)]}</span>
      <span className={isToday(d) ? "grid h-6 min-w-6 place-items-center rounded-(--radius-full) bg-(--bg-fill-critical) px-1.5 heading-sm text-(--text-critical-on-bg-fill)" : "heading-sm"}>{d.getDate()}</span>
    </button>
  );
}

function dateCols(cal: Cal, events: Ev[], allDay: AllDay[]): GridCol[] {
  const days = cal.view === "day" ? [cal.cursor] : weekDays(cal.cursor);
  return days.map((d) => ({
    key: toKey(d),
    date: d,
    header: cal.view === "day" ? <div className="px-3 py-2 body-md-semibold">{`${WD_LONG[wd(d)]} ${d.getDate()}`}{isToday(d) && <span className="ml-2"><Badge tone="info">Today</Badge></span>}</div> : <DayHeader d={d} cal={cal} />,
    events: events.filter((e) => e.date === toKey(d)),
    allDay: allDay.filter((a) => a.date === toKey(d)),
  }));
}

/* ── Month grid ────────────────────────────────────────────────────── */

function MonthChip({ e, style, onPick }: { e: Ev; style: "bar" | "dot"; onPick?: Pick }) {
  const k = kindOf(e.kind);
  const past = e.date < TODAY_KEY;
  return (
    <button
      type="button"
      onClick={(ev) => onPick?.(e, ev.currentTarget.getBoundingClientRect())}
      className={`flex w-full min-w-0 items-center gap-1 rounded-(--radius-100) px-1 py-px text-left body-sm hover:bg-(--bg-surface-hover) ${style === "bar" ? `border-l-2 ${k.bar}` : ""} ${past ? "text-(--text-secondary)" : ""}`}
    >
      {style === "dot" && <span className={`size-1.5 shrink-0 rounded-full ${k.dot}`} />}
      {style === "bar" && <span className="shrink-0 text-(--text-secondary)">{hh(e.start)}</span>}
      <span className="min-w-0 flex-1 truncate">{e.title}</span>
      {style === "dot" && <span className="shrink-0 text-(--text-secondary)">{hh(e.start)}</span>}
    </button>
  );
}

function MonthGrid({ cal, events, allDay, onPick, chip = "bar", hatchSunday }: { cal: Cal; events: Ev[]; allDay: AllDay[]; onPick?: Pick; chip?: "bar" | "dot"; hatchSunday?: boolean }) {
  const days = monthGrid(cal.cursor);
  const month = cal.cursor.getMonth();
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-(--border-secondary)">
          {WD.map((d, i) => <span key={d} className={`px-2 py-2 body-sm text-(--text-secondary) ${i ? "border-l border-(--border-secondary)" : ""}`}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const k = toKey(d);
            const dayAllDay = allDay.filter((a) => a.date === k);
            const dayEvents = events.filter((e) => e.date === k).sort((a, b) => a.start - b.start);
            const total = dayAllDay.length + dayEvents.length;
            const room = total > 4 ? 3 : 4; // leave a line for "+N more"
            const shownAllDay = dayAllDay.slice(0, room);
            const shownEvents = dayEvents.slice(0, room - shownAllDay.length);
            const more = total - shownAllDay.length - shownEvents.length;
            const outside = d.getMonth() !== month;
            return (
              <div key={k} className={`relative flex min-h-32 min-w-0 flex-col gap-0.5 p-1 ${i % 7 ? "border-l border-(--border-secondary)" : ""} ${i < days.length - 7 ? "border-b border-(--border-secondary)" : ""} ${outside ? "bg-(--bg-surface-secondary)" : ""}`}>
                {hatchSunday && i % 7 === 6 && <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--bg-surface-secondary)_6px_12px)]" />}
                <button
                  type="button"
                  onClick={() => cal.openDay(d)}
                  aria-label={`Open ${short(d)}`}
                  className={`relative ml-auto grid h-6 min-w-6 place-items-center rounded-(--radius-full) px-1.5 body-sm hover:bg-(--bg-surface-hover) ${isToday(d) ? "bg-(--bg-fill-critical) text-(--text-critical-on-bg-fill) hover:bg-(--bg-fill-critical)" : outside ? "text-(--text-disabled)" : ""}`}
                >
                  {d.getDate() === 1 ? `${d.getDate()} ${MO[d.getMonth()].slice(0, 3)}` : d.getDate()}
                </button>
                {shownAllDay.map((a) => <AllDayChip key={a.id} a={a} compact />)}
                {shownEvents.map((e) => <MonthChip key={e.id} e={e} style={chip} onPick={onPick} />)}
                {more > 0 && (
                  <button type="button" onClick={() => cal.openDay(d)} className="relative self-start rounded-(--radius-100) px-1 body-sm text-(--text-secondary) hover:bg-(--bg-surface-hover)">
                    {`${more} more`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Event details: panel and popover ──────────────────────────────── */

function EventPanel({ e, onClose }: { e: Ev; onClose?: () => void }) {
  const k = kindOf(e.kind);
  return (
    <Card padding="0">
      <div className="flex items-center gap-2 border-b border-(--border-secondary) px-4 py-3">
        <span className={`size-2.5 rounded-full ${k.dot}`} />
        <span className="flex-1 body-md-semibold">{k.one}</span>
        {e.status && <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>}
        {onClose && <Button variant="tertiary" icon={<X className="size-4" />} accessibilityLabel="Close" onClick={onClose} />}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <p className="heading-md">{e.title}</p>
        <p className="flex items-center gap-2 body-md"><Clock className="size-4 text-(--icon-secondary)" />{`${short(fromKey(e.date))} · ${hh(e.start)} – ${hh(e.end)}`}</p>
        <p className="flex items-center gap-2 body-md"><User className="size-4 text-(--icon-secondary)" />{e.who}</p>
        {e.kind === "appointment" && <p className="flex items-center gap-2 body-md"><Phone className="size-4 text-(--icon-secondary)" />07700 900412</p>}
        <p className="flex items-center gap-2 body-md"><MapPin className="size-4 text-(--icon-secondary)" />Forecourt, Southall</p>
        <div className="flex items-center gap-2 rounded-(--radius-200) border border-(--border-secondary) p-2">
          <RegPlate registration={e.reg} size="sm" /><span className="truncate body-md">{e.car}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-(--border-secondary) px-4 py-3">
        <Button variant="primary">{e.kind === "appointment" ? "Mark attended" : e.kind === "workshop" ? "Open job" : "Mark done"}</Button>
        <Button>Reschedule</Button>
        <Button variant="plain" tone="critical">Cancel event</Button>
      </div>
    </Card>
  );
}

type Picked = { e: Ev; rect: DOMRect } | null;

/** Amie-style floating card beside the clicked event. Closes on scroll, Escape or a click outside. */
function EventPopover({ picked, onClose }: { picked: Picked; onClose: () => void }) {
  React.useEffect(() => {
    if (!picked) return;
    const esc = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("keydown", esc);
    };
  }, [picked, onClose]);
  if (!picked) return null;
  const W = 340;
  const { rect } = picked;
  const left = rect.right + 8 + W < window.innerWidth ? rect.right + 8 : Math.max(8, rect.left - W - 8);
  const top = Math.max(8, Math.min(rect.top, window.innerHeight - 440));
  return (
    <>
      <button type="button" aria-label="Close event details" className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
      <div role="dialog" aria-label={picked.e.title} className="fixed z-50 rounded-(--radius-300) shadow-(--shadow-600)" style={{ left, top, width: W }}>
        <EventPanel e={picked.e} onClose={onClose} />
      </div>
    </>
  );
}

function usePopover() {
  const [picked, setPicked] = React.useState<Picked>(null);
  const close = React.useCallback(() => setPicked(null), []);
  const pick = React.useCallback<Pick>((e, rect) => setPicked({ e, rect }), []);
  return { picked, pick, close };
}

/* ── Mini month (Cron / Notion Calendar rail) ──────────────────────── */

function MiniMonth({ cal, events }: { cal: Cal; events: Ev[] }) {
  const [offset, setOffset] = React.useState(0);
  const shown = new Date(cal.cursor.getFullYear(), cal.cursor.getMonth() + offset, 1);
  const inRange = new Set(cal.view === "month" ? [] : cal.days.map(toKey));
  const busy = new Set(events.map((e) => e.date));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="body-md-semibold">{`${MO[shown.getMonth()]} ${shown.getFullYear()}`}</span>
        <ButtonGroup gap="tight">
          <Button variant="tertiary" size="micro" icon={<ChevronLeft className="size-4" />} accessibilityLabel="Previous month" onClick={() => setOffset((o) => o - 1)} />
          <Button variant="tertiary" size="micro" icon={<ChevronRight className="size-4" />} accessibilityLabel="Next month" onClick={() => setOffset((o) => o + 1)} />
        </ButtonGroup>
      </div>
      <div className="grid grid-cols-7 text-center body-sm">
        {WD.map((d) => <span key={d} className="py-1 text-(--text-secondary)">{d.slice(0, 2)}</span>)}
        {monthGrid(shown).map((d) => {
          const k = toKey(d);
          const sel = inRange.has(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                cal.setCursor(d);
                setOffset(0);
              }}
              aria-label={short(d)}
              className={`relative mx-auto my-px grid size-7 place-items-center rounded-(--radius-full) hover:bg-(--bg-surface-hover) ${isToday(d) ? "bg-(--bg-fill-critical) text-(--text-critical-on-bg-fill) hover:bg-(--bg-fill-critical)" : sel ? "bg-(--bg-surface-selected) body-md-semibold" : d.getMonth() !== shown.getMonth() ? "text-(--text-disabled)" : ""}`}
            >
              {d.getDate()}
              {busy.has(k) && !isToday(d) && <span className="absolute bottom-0.5 size-1 rounded-full bg-(--bg-fill-info)" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function nextUp(events: Ev[]) {
  return events.filter((e) => e.date === TODAY_KEY && e.start > NOW).sort((a, b) => a.start - b.start)[0];
}
const inHm = (t: number) => {
  const m = Math.round((t - NOW) * 60);
  return m >= 60 ? `in ${Math.floor(m / 60)}h ${m % 60}m` : `in ${m}m`;
};

/* ── A — Cron / Notion Calendar ─────────────────────────────────────── */
function VariationA() {
  const cal = useCalendar("week");
  const kinds = useKinds();
  const pop = usePopover();
  const events = EVENTS.filter((e) => kinds.shown.has(e.kind));
  const allDay = kinds.shown.has("maintenance") ? ALL_DAY : [];
  const up = nextUp(events);
  return (
    <Page title="Master calendar" fullWidth className="w-full">
      <Card padding="0">
        <div tabIndex={-1} onKeyDown={cal.onKeyDown} className="grid outline-none lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[232px_minmax(0,1fr)_248px]">
          <aside className="flex flex-col gap-5 border-b border-(--border-secondary) p-4 lg:border-r lg:border-b-0">
            <MiniMonth cal={cal} events={events} />
            <div className="flex flex-col gap-2">
              <span className="body-sm text-(--text-secondary)">Calendars</span>
              {KINDS.map((k) => (
                <div key={k.kind} className="flex items-center justify-between gap-2">
                  <Checkbox label={<span className="inline-flex items-center gap-2"><span className={`size-2.5 rounded-(--radius-050) ${k.dot}`} />{k.label}</span>} checked={kinds.shown.has(k.kind)} onChange={() => kinds.toggle(k.kind)} />
                  <span className="body-sm text-(--text-secondary)">{EVENTS.filter((e) => e.kind === k.kind && inDays(cal.days)(e)).length}</span>
                </div>
              ))}
            </div>
          </aside>
          <section className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 border-b border-(--border-secondary) px-4 py-3">
              <h2 className="heading-lg">{cal.view === "month" ? MO[cal.cursor.getMonth()] : cal.label}<span className="text-(--text-secondary)">{` ${cal.cursor.getFullYear()}`}</span></h2>
              <div className="ml-auto flex items-center gap-2">
                <ViewSwitch cal={cal} />
                <Button onClick={cal.goToday}>Today</Button>
                <StepButtons cal={cal} vertical />
              </div>
            </div>
            {cal.view === "month" ? (
              <MonthGrid cal={cal} events={events} allDay={allDay} onPick={pop.pick} chip="bar" />
            ) : (
              <TimeGrid cal={cal} cols={dateCols(cal, events, allDay)} onPick={pop.pick} selected={pop.picked?.e.id} />
            )}
          </section>
          <aside className="hidden flex-col gap-5 border-l border-(--border-secondary) p-4 xl:flex">
            <div className="flex flex-col gap-2">
              <span className="body-sm text-(--text-secondary)">Up next</span>
              {up ? (
                <div className="flex flex-col gap-2 rounded-(--radius-300) border border-(--border-secondary) p-3">
                  <p className="body-md-semibold">{up.title}</p>
                  <p className="body-sm text-(--text-secondary)">{`${hh(up.start)} – ${hh(up.end)} · ${inHm(up.start)}`}</p>
                  <div className="flex items-center gap-2"><RegPlate registration={up.reg} size="sm" /><span className="truncate body-sm">{up.car}</span></div>
                  <Button onClick={() => cal.openDay(TODAY)}>Open today</Button>
                </div>
              ) : (
                <p className="body-sm text-(--text-secondary)">Nothing else today</p>
              )}
            </div>
            {allDay.some((a) => a.date === TODAY_KEY) && (
              <div className="flex flex-col gap-2">
                <span className="body-sm text-(--text-secondary)">Due today</span>
                {allDay.filter((a) => a.date === TODAY_KEY).map((a) => (
                  <div key={a.id} className="flex items-center gap-2"><RegPlate registration={a.reg} size="sm" /><span className="truncate body-sm">{a.text}</span></div>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="body-sm text-(--text-secondary)">Shortcuts</span>
              {[["Today", ["T"]], ["Day, week, month", ["D", "W", "M"]], ["Previous, next", ["←", "→"]]].map(([label, keys]) => (
                <div key={label as string} className="flex items-center justify-between body-sm">
                  <span>{label as string}</span>
                  <span className="flex gap-1">{(keys as string[]).map((k) => <KeyboardKey key={k} size="small">{k}</KeyboardKey>)}</span>
                </div>
              ))}
              <p className="body-sm text-(--text-secondary)">Click the calendar first.</p>
            </div>
          </aside>
        </div>
      </Card>
      <EventPopover picked={pop.picked} onClose={pop.close} />
    </Page>
  );
}

/* ── B — Amie: to-schedule list + calendar, drag to book ───────────── */

type Todo = { id: string; kind: Kind; title: string; reg: string; car: string; hours: number; due: "Overdue" | "Today" | "This week" };
const TODOS: Todo[] = [
  { id: "t1", kind: "maintenance", title: "MOT", reg: "MA66 KPE", car: "Audi A4", hours: 1, due: "Overdue" },
  { id: "t2", kind: "maintenance", title: "Replace battery", reg: "LT67 VJD", car: "Ford Fiesta", hours: 1, due: "Today" },
  { id: "t3", kind: "maintenance", title: "Key fob battery", reg: "WF66 NYU", car: "Audi A3", hours: 0.5, due: "Today" },
  { id: "t4", kind: "workshop", title: "Valet before handover", reg: "RK69 KRT", car: "BMW X1", hours: 1, due: "This week" },
];
const DUE_TONE: Record<Todo["due"], BadgeTone> = { Overdue: "critical", Today: "attention", "This week": "info" };

function VariationB() {
  const cal = useCalendar("week");
  const kinds = useKinds();
  const pop = usePopover();
  const [booked, setBooked] = React.useState<Ev[]>([]);
  const [todos, setTodos] = React.useState(TODOS);
  const [quick, setQuick] = React.useState("");
  const all = [...EVENTS, ...booked];
  const events = all.filter((e) => kinds.shown.has(e.kind));
  const allDay = kinds.shown.has("maintenance") ? ALL_DAY : [];

  const book = (id: string, date: Date, hour: number) => {
    const t = todos.find((x) => x.id === id);
    if (!t) return;
    setTodos((ts) => ts.filter((x) => x.id !== id));
    setBooked((b) => [...b, { id: `b-${id}`, kind: t.kind, date: toKey(date), start: hour, end: hour + t.hours, title: t.title, reg: t.reg, car: t.car, who: "You" }]);
  };
  const addQuick = () => {
    if (!quick.trim()) return;
    setBooked((b) => [...b, { id: `q-${b.length}`, kind: "appointment", date: toKey(addDays(TODAY, 1)), start: 14, end: 15, title: quick.trim(), reg: "—", car: "Not linked yet", who: "You", status: "Pending" }]);
    setQuick("");
    cal.setCursor(addDays(TODAY, 1));
  };

  return (
    <Page title="Master calendar" fullWidth className="w-full">
      <Card padding="0">
        <div tabIndex={-1} onKeyDown={cal.onKeyDown} className="grid outline-none lg:grid-cols-[264px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-3 border-b border-(--border-secondary) p-4 lg:border-r lg:border-b-0">
            <div className="flex items-center gap-2">
              <h2 className="heading-sm">To schedule</h2>
              <Badge>{String(todos.length)}</Badge>
            </div>
            <p className="body-sm text-(--text-secondary)">Drag a job onto a free slot to book it.</p>
            {todos.length === 0 && <p className="rounded-(--radius-200) border border-dashed border-(--border) px-3 py-6 text-center body-sm text-(--text-secondary)">Everything is booked</p>}
            {todos.map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                className="flex cursor-grab items-start gap-2 rounded-(--radius-200) border border-(--border-secondary) bg-(--bg-surface) p-2 hover:shadow-(--shadow-200) active:cursor-grabbing"
              >
                <GripVertical className="mt-0.5 size-4 shrink-0 text-(--icon-secondary)" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 shrink-0 rounded-full ${kindOf(t.kind).dot}`} />
                    <span className="truncate body-md-semibold">{t.title}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <RegPlate registration={t.reg} size="sm" />
                    <Badge tone={DUE_TONE[t.due]}>{t.due}</Badge>
                    <span className="body-sm text-(--text-secondary)">{t.hours < 1 ? "30m" : `${t.hours}h`}</span>
                    <span className="ml-auto">
                      <Button variant="plain" onClick={() => book(t.id, cal.view === "month" ? TODAY : cal.cursor, 16)}>Book</Button>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </aside>
          <section className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-(--border-secondary) px-4 py-2.5">
              <span className="body-sm text-(--text-secondary)">Calendar</span>
              <ChevronRight className="size-3.5 text-(--icon-secondary)" />
              <span className="body-md-semibold">{cal.label}</span>
              {cal.view === "week" && <Badge>{`W${Math.ceil((weekStart(cal.cursor).getTime() - new Date(2025, 11, 29).getTime()) / 6048e5) + 1}`}</Badge>}
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-(--radius-full) border border-(--border-secondary) px-2 py-1">
                  {KINDS.map((k) => (
                    <button key={k.kind} type="button" aria-pressed={kinds.shown.has(k.kind)} title={k.label} aria-label={`Show ${k.label.toLowerCase()}`} onClick={() => kinds.toggle(k.kind)} className={`size-3 rounded-full ${kinds.shown.has(k.kind) ? k.dot : "border border-(--border) bg-(--bg-surface)"}`} />
                  ))}
                  <span className="ml-1 body-sm">{plural(kinds.shown.size, "calendar")}</span>
                </div>
                <StepButtons cal={cal} />
                <Button onClick={cal.goToday}>Today</Button>
                <ViewSwitch cal={cal} />
              </div>
            </div>
            {cal.view === "month" ? (
              <MonthGrid cal={cal} events={events} allDay={allDay} onPick={pop.pick} chip="dot" hatchSunday />
            ) : (
              <TimeGrid cal={cal} cols={dateCols(cal, events, allDay)} onPick={pop.pick} selected={pop.picked?.e.id} hatchSunday onDropItem={book} maxHeight={430} />
            )}
            <div className="border-t border-(--border-secondary) p-3">
              <div onKeyDown={(e) => e.key === "Enter" && addQuick()}>
                <TextField
                  label="Quick add"
                  labelHidden
                  prefix={<Sparkles className="size-4 text-(--icon-magic)" />}
                  placeholder="Book a test drive for the BMW X1 tomorrow at 2pm"
                  value={quick}
                  onChange={setQuick}
                  autoComplete="off"
                />
              </div>
            </div>
          </section>
        </div>
      </Card>
      <EventPopover picked={pop.picked} onClose={pop.close} />
    </Page>
  );
}

/* ── C — Day lanes by type + detail panel (Square, Fresha) ─────────── */
function VariationC() {
  const cal = useCalendar("day");
  const kinds = useKinds();
  const [sel, setSel] = React.useState<Ev | null>(EVENTS[0]);
  const events = EVENTS.filter((e) => kinds.shown.has(e.kind));
  const allDay = kinds.shown.has("maintenance") ? ALL_DAY : [];
  const inView = EVENTS.filter(inDays(cal.days));
  const key = toKey(cal.cursor);
  const laneCols: GridCol[] = KINDS.filter((k) => kinds.shown.has(k.kind)).map((k) => ({
    key: `${key}-${k.kind}`,
    date: cal.cursor,
    header: (
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`size-2 rounded-full ${k.dot}`} /><span className="body-md-semibold">{k.label}</span>
        <Badge>{String(events.filter((e) => e.kind === k.kind && e.date === key).length)}</Badge>
      </div>
    ),
    events: events.filter((e) => e.kind === k.kind && e.date === key),
    allDay: k.kind === "maintenance" ? allDay.filter((a) => a.date === key) : [],
  }));
  const pick: Pick = (e) => setSel(e);
  return (
    <Page title="Master calendar" subtitle="Appointments, workshop walk-ins and maintenance in one view." fullWidth className="w-full">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card padding="0">
          <div tabIndex={-1} onKeyDown={cal.onKeyDown} className="outline-none">
            <Toolbar cal={cal} />
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border-secondary) px-4 py-2">
              <FilterChips kinds={kinds} events={inView} />
              <span className="body-sm text-(--text-secondary)">{plural(events.filter(inDays(cal.days)).length, "event")}</span>
            </div>
            {cal.view === "month" ? (
              <MonthGrid cal={cal} events={events} allDay={allDay} onPick={pick} />
            ) : cal.view === "day" ? (
              laneCols.length ? <TimeGrid cal={cal} cols={laneCols} onPick={pick} selected={sel?.id} /> : <EmptyState heading="All types are hidden">Turn a type back on to see its lane.</EmptyState>
            ) : (
              <TimeGrid cal={cal} cols={dateCols(cal, events, allDay)} onPick={pick} selected={sel?.id} />
            )}
          </div>
        </Card>
        <div className="xl:sticky xl:top-4 xl:self-start">
          {sel ? <EventPanel e={sel} onClose={() => setSel(null)} /> : <Card><p className="body-sm text-(--text-secondary)">Select an event to see its details.</p></Card>}
        </div>
      </div>
    </Page>
  );
}

/* ── D — Polished grid with opening hours (Google Calendar, Fresha) ── */
function VariationD() {
  const cal = useCalendar("week");
  const kinds = useKinds();
  const pop = usePopover();
  const events = EVENTS.filter((e) => kinds.shown.has(e.kind));
  const allDay = kinds.shown.has("maintenance") ? ALL_DAY : [];
  return (
    <Page title="Master calendar" fullWidth className="w-full">
      <Card padding="0">
        <div tabIndex={-1} onKeyDown={cal.onKeyDown} className="outline-none">
          <Toolbar cal={cal} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border-secondary) px-4 py-2">
            <FilterChips kinds={kinds} events={EVENTS.filter(inDays(cal.days))} />
            <span className="body-sm text-(--text-secondary)">Open 9:00 – 17:00 · closed Sundays</span>
          </div>
          {cal.view === "month" ? (
            <MonthGrid cal={cal} events={events} allDay={allDay} onPick={pop.pick} hatchSunday />
          ) : (
            <TimeGrid cal={cal} cols={dateCols(cal, events, allDay)} onPick={pop.pick} selected={pop.picked?.e.id} closedHours hatchSunday />
          )}
        </div>
      </Card>
      <EventPopover picked={pop.picked} onClose={pop.close} />
    </Page>
  );
}

/* ── E — Schedule list (Notion Calendar schedule, Jobber, Square) ──── */
function VariationE() {
  const cal = useCalendar("week");
  const kinds = useKinds();
  const [sel, setSel] = React.useState<Ev | null>(null);
  const events = EVENTS.filter((e) => kinds.shown.has(e.kind));
  const allDay = kinds.shown.has("maintenance") ? ALL_DAY : [];
  const days = cal.days.filter((d) => isToday(d) || events.some((e) => e.date === toKey(d)) || allDay.some((a) => a.date === toKey(d)));
  const up = nextUp(events);
  return (
    <Page title="Master calendar" fullWidth className="w-full">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card padding="0">
          <div tabIndex={-1} onKeyDown={cal.onKeyDown} className="outline-none">
            <Toolbar cal={cal} />
            <div className="border-b border-(--border-secondary) px-4 py-2"><FilterChips kinds={kinds} events={EVENTS.filter(inDays(cal.days))} /></div>
            {days.length === 0 && <EmptyState heading="Nothing booked" action={{ content: "New event", onAction: () => newEvent(cal) }}>No events in this range. Try the next one.</EmptyState>}
            {days.map((d) => {
              const k = toKey(d);
              const evs = events.filter((e) => e.date === k).sort((a, b) => a.start - b.start);
              const due = allDay.filter((a) => a.date === k);
              return (
                <section key={k}>
                  <div className={`sticky top-0 z-[1] flex items-center gap-2 px-4 py-2 ${isToday(d) ? "bg-(--bg-surface-info)" : "bg-(--bg-surface-secondary)"}`}>
                    <button type="button" onClick={() => cal.openDay(d)} className="body-md-semibold hover:underline">{isToday(d) ? `Today · ${short(d)}` : short(d)}</button>
                    <Badge>{plural(evs.length, "event")}</Badge>
                  </div>
                  {due.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 border-t border-(--border-secondary) px-4 py-2">
                      <span className="w-28 shrink-0 body-sm text-(--text-secondary)">All day</span>
                      <Wrench className="size-4 shrink-0 text-(--text-magic)" /><RegPlate registration={a.reg} size="sm" /><span className="truncate body-md">{a.text}</span>
                    </div>
                  ))}
                  {evs.length === 0 && due.length === 0 && <p className="border-t border-(--border-secondary) px-4 py-3 body-sm text-(--text-secondary)">Nothing booked</p>}
                  {evs.map((e) => {
                    const kd = kindOf(e.kind);
                    return (
                      <button key={e.id} type="button" onClick={() => setSel(e)} className={`flex w-full items-center gap-3 border-t border-(--border-secondary) px-4 py-3 text-left hover:bg-(--bg-surface-hover) ${sel?.id === e.id ? "bg-(--bg-surface-selected)" : ""}`}>
                        <span className="w-28 shrink-0 body-md-numeric">{`${hh(e.start)} – ${hh(e.end)}`}</span>
                        <span className={`h-9 w-1 shrink-0 rounded-(--radius-full) ${kd.dot}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate body-md-semibold">{e.title}</span>
                          <span className="block truncate body-sm text-(--text-secondary)">{`${kd.one} · ${e.who}`}</span>
                        </span>
                        <RegPlate registration={e.reg} size="sm" />
                        {e.status && <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>}
                      </button>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </Card>
        <div className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
          {sel ? (
            <EventPanel e={sel} onClose={() => setSel(null)} />
          ) : (
            <>
              <Card title="Today at a glance">
                {KINDS.map((k) => (
                  <div key={k.kind} className="flex items-center justify-between"><span className="inline-flex items-center gap-2 body-md"><span className={`size-2 rounded-full ${k.dot}`} />{k.label}</span><span className="heading-sm">{EVENTS.filter((e) => e.kind === k.kind && e.date === TODAY_KEY).length}</span></div>
                ))}
              </Card>
              {up && (
                <Card title="Up next">
                  <p className="heading-sm">{`${hh(up.start)} · ${up.title}`}</p>
                  <p className="body-sm text-(--text-secondary)">{`${up.who} · ${up.car} · ${inHm(up.start)}`}</p>
                  <Button onClick={() => setSel(up)}>Open appointment</Button>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </Page>
  );
}

/* ── States ────────────────────────────────────────────────────────── */
function States() {
  return (
    <div className="grid gap-4 p-6 lg:grid-cols-3">
      <Card title="Loading the week"><SkeletonBodyText lines={6} /></Card>
      <Card padding="0">
        <EmptyState icon={<CalendarDays className="fill-none" />} heading="Nothing booked today" action={{ content: "New event" }}>
          Click any free slot to book an appointment or a workshop job.
        </EmptyState>
      </Card>
      <Card title="Booking from a slot">
        <p className="body-sm text-(--text-secondary)">Wed 23 Sep · 15:00 – 16:00</p>
        <div className="flex flex-col gap-2">
          {KINDS.map((k) => (
            <button key={k.kind} type="button" className="flex items-center gap-2 rounded-(--radius-200) border border-(--border) px-3 py-2 text-left hover:bg-(--bg-surface-hover)">
              <span className={`size-2 rounded-full ${k.dot}`} /><span className="body-md">{`New ${k.one.toLowerCase()}`}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2"><Avatar size="sm" name="Raza Jaffery" /><span className="body-sm text-(--text-secondary)">Assigned to you</span></div>
      </Card>
    </div>
  );
}

const VARIATIONS = [
  { key: "A", name: "Mini month rail, week grid, up next", refs: "Cron / Notion Calendar", C: VariationA },
  { key: "B", name: "To-schedule list, drag onto the calendar", refs: "Amie", C: VariationB },
  { key: "C", name: "Day lanes by type with a detail panel", refs: "Square Appointments, Fresha", C: VariationC },
  { key: "D", name: "Polished grid with opening hours", refs: "Google Calendar, Fresha", C: VariationD },
  { key: "E", name: "Schedule list with today at a glance", refs: "Notion Calendar schedule, Jobber", C: VariationE },
];

export default function PrototypePage() {
  return (
    <main className="flex flex-col gap-10 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="heading-lg">Prototype — Calendar</h1>
        <p className="body-md text-(--text-secondary)">
          Five directions for the shared calendar (Master calendar, Maintenance calendar, Sales appointments). Day, Week
          and Month all work in every variation: Today and the arrows move the range, clicking a date opens that day,
          clicking a free slot starts a booking and clicking an event opens it. Pick one (A–E).
        </p>
      </header>
      {VARIATIONS.map(({ key, name, refs, C }) => (
        <section key={key} id={`variation-${key}`} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-3">
            <h2 className="heading-md">{`Variation ${key} — ${name}`}</h2>
            <span className="body-sm text-(--text-secondary)">{`Reference: ${refs}`}</span>
          </div>
          <div className="relative overflow-hidden rounded-(--radius-400) border border-(--border) bg-(--bg)">
            <C />
          </div>
        </section>
      ))}
      <section id="states" className="flex flex-col gap-2">
        <h2 className="heading-md">States (all variations)</h2>
        <div className="overflow-hidden rounded-(--radius-400) border border-(--border) bg-(--bg)"><States /></div>
      </section>
    </main>
  );
}
