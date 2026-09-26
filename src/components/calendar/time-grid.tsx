"use client";

import { useLayoutEffect, useRef } from "react";
import { Plus } from "lucide-react";
import {
  DOW,
  byStart,
  dayLabel,
  fmtHour,
  gridWindow,
  isPast,
  layoutLanes,
  toISO,
  weekdayMon0,
  type BusinessHours,
  type CalEvent,
} from "@/lib/calendar-model";
import { cn } from "@/lib/utils";
import { AllDayChip, TimeGridEvent, type OpenEvent } from "./event-card";

// A card is never shorter than this, whatever the hour height.
const MIN_CARD_PX = 20;
// Free strip on the right of each day, so a busy slot can still be clicked.
const SLOT_GUTTER_PX = 8;
const ALL_DAY_SHOWN = 2;

interface GridFrame {
  start: number;
  total: number;
  pct: (h: number) => string;
}

/**
 * The day and week grids. The hours run from an hour before opening to an
 * hour after closing, with the closed part shaded. Rows grow to fill the card
 * and scroll once they reach their minimum height. The day headers and the
 * all-day row stay pinned while the hours scroll.
 */
export function TimeGrid({
  days,
  events,
  hours,
  hourPx,
  todayISO,
  nowHour,
  selectedKey,
  draft,
  onOpenDay,
  onOpenEvent,
  onCreateAt,
}: {
  days: Date[];
  events: CalEvent[];
  hours: BusinessHours;
  /** Minimum height of an hour row. */
  hourPx: number;
  todayISO: string;
  nowHour: number | null;
  selectedKey: string | null;
  /** The slot a new event is being booked into. */
  draft: { date: string; hour: number } | null;
  onOpenDay?: (d: Date) => void;
  onOpenEvent: OpenEvent;
  onCreateAt: (date: string, hour: number) => void;
}) {
  const { start, end } = gridWindow(hours);
  const total = end - start;
  const frame: GridFrame = { start, total, pct: (h) => `${((h - start) / total) * 100}%` };
  const isos = days.map(toISO);
  const inView = events.filter((e) => isos.includes(e.date));
  const allDay = isos.map((iso) => inView.filter((e) => e.allDay && e.date === iso).sort(byStart));
  const showNow =
    nowHour !== null && nowHour >= start && nowHour <= end && isos.includes(todayISO);

  // Open on the first booking in view (or on now, or opening time) rather
  // than at the top of a grid that may start before anyone is in.
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const firstStart = inView.filter((e) => !e.allDay).reduce((m, e) => Math.min(m, e.start), Infinity);
  const focusHour = Number.isFinite(firstStart) ? firstStart : showNow && nowHour !== null ? nowHour - 1 : hours.open;
  const rangeKey = `${isos[0]}:${isos.length}`;
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const body = bodyRef.current;
    if (!scroller || !body) return;
    // The body has 8px of padding top and bottom around the hour rows.
    const frac = (Math.max(start, focusHour - 0.25) - start) / total;
    scroller.scrollTop = Math.max(0, frac * (body.clientHeight - 16));
    // Only when the range or view changes, not on every refresh of the data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  const single = days.length === 1;

  return (
    <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
      <div className={cn("flex min-h-full flex-col", !single && "min-w-[680px]")}>
        <div className="sticky top-0 z-40 border-b border-(--border-secondary) bg-(--bg-surface)">
          <div className="flex">
            <div className="w-14 shrink-0" />
            {days.map((d, i) => (
              <DayHeader
                key={isos[i]}
                date={d}
                isToday={isos[i] === todayISO}
                count={single ? inView.length : null}
                onOpen={single ? undefined : onOpenDay}
              />
            ))}
          </div>
          {allDay.some((list) => list.length > 0) ? (
            <div className="flex border-t border-(--border-secondary)">
              <div className="flex w-14 shrink-0 justify-end py-1.5 pr-2 body-xs text-(--text-secondary)">All day</div>
              {days.map((d, i) => (
                <div key={isos[i]} className="flex min-w-0 flex-1 flex-col gap-0.5 border-l border-(--border-secondary) p-1">
                  {allDay[i].slice(0, single ? undefined : ALL_DAY_SHOWN).map((ev) => (
                    <AllDayChip
                      key={ev.key}
                      ev={ev}
                      past={isPast(ev, todayISO, nowHour)}
                      selected={ev.key === selectedKey}
                      onOpen={onOpenEvent}
                    />
                  ))}
                  {!single && allDay[i].length > ALL_DAY_SHOWN ? (
                    <button
                      type="button"
                      onClick={() => onOpenDay?.(d)}
                      className="self-start rounded-(--radius-100) px-1.5 body-xs-semibold text-(--text-secondary) hover:bg-(--bg-surface-hover)"
                    >
                      {`${allDay[i].length - ALL_DAY_SHOWN} more`}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div ref={bodyRef} className="relative flex flex-1 py-2" style={{ minHeight: total * hourPx + 16 }}>
          <HourGutter frame={frame} end={end} nowHour={showNow ? nowHour : null} />
          {days.map((d, i) => (
            <DayColumn
              key={isos[i]}
              date={d}
              iso={isos[i]}
              events={inView.filter((e) => !e.allDay && e.date === isos[i])}
              frame={frame}
              end={end}
              hours={hours}
              todayISO={todayISO}
              nowHour={nowHour}
              selectedKey={selectedKey}
              draftHour={draft && draft.date === isos[i] ? draft.hour : null}
              onOpenEvent={onOpenEvent}
              onCreateAt={onCreateAt}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayHeader({
  date,
  isToday,
  count,
  onOpen,
}: {
  date: Date;
  isToday: boolean;
  /** Day view shows how many events the day holds. */
  count: number | null;
  onOpen?: (d: Date) => void;
}) {
  const content = (
    <>
      <span className={cn("body-sm", isToday ? "text-(--text)" : "text-(--text-secondary)")}>
        {DOW[weekdayMon0(date)]}
      </span>
      <span
        className={cn(
          "grid h-6 min-w-6 place-items-center rounded-(--radius-full) px-1 heading-sm tabular-nums",
          isToday && "bg-(--bg-fill-critical) text-(--text-critical-on-bg-fill)",
        )}
      >
        {date.getDate()}
      </span>
      {count !== null ? (
        <span className="body-sm text-(--text-secondary)">{`· ${count} ${count === 1 ? "event" : "events"}`}</span>
      ) : null}
    </>
  );
  const cls = "flex min-w-0 flex-1 items-center gap-1.5 border-l border-(--border-secondary) py-2";
  return onOpen ? (
    <button
      type="button"
      onClick={() => onOpen(date)}
      title={`Open ${dayLabel(date)}`}
      className={cn(cls, "justify-center transition-colors hover:bg-(--bg-surface-hover)")}
    >
      {content}
    </button>
  ) : (
    <div className={cn(cls, "px-3")}>{content}</div>
  );
}

function HourGutter({ frame, end, nowHour }: { frame: GridFrame; end: number; nowHour: number | null }) {
  const labels = Array.from({ length: frame.total + 1 }, (_, i) => frame.start + i).filter((h) => h <= end);
  return (
    <div aria-hidden className="relative w-14 shrink-0">
      {labels.map((h) => (
        <span
          key={h}
          className={cn(
            "absolute right-2 -translate-y-1/2 body-xs tabular-nums text-(--text-secondary)",
            // Make room for the current-time pill.
            nowHour !== null && Math.abs(nowHour - h) < 0.3 && "opacity-0",
          )}
          style={{ top: frame.pct(h) }}
        >
          {fmtHour(h)}
        </span>
      ))}
      {nowHour !== null ? (
        <span
          className="absolute right-1 z-10 -translate-y-1/2 rounded-(--radius-100) bg-(--bg-fill-critical) px-1 py-px body-xs-semibold tabular-nums text-(--text-critical-on-bg-fill)"
          style={{ top: frame.pct(nowHour) }}
        >
          {fmtHour(nowHour)}
        </span>
      ) : null}
    </div>
  );
}

function DayColumn({
  date,
  iso,
  events,
  frame,
  end,
  hours,
  todayISO,
  nowHour,
  selectedKey,
  draftHour,
  onOpenEvent,
  onCreateAt,
}: {
  date: Date;
  iso: string;
  events: CalEvent[];
  frame: GridFrame;
  end: number;
  hours: BusinessHours;
  todayISO: string;
  nowHour: number | null;
  selectedKey: string | null;
  draftHour: number | null;
  onOpenEvent: OpenEvent;
  onCreateAt: (date: string, hour: number) => void;
}) {
  const { start, total, pct } = frame;
  const timed = events.filter((e) => e.end > start && e.start < end);
  const lanes = layoutLanes(timed);
  const rows = Array.from({ length: total }, (_, i) => start + i);
  const isToday = iso === todayISO;

  return (
    <div className="relative flex min-w-0 flex-1 flex-col border-l border-(--border-secondary)">
      {/* Closed before opening and after closing. */}
      <div aria-hidden className="absolute inset-x-0 top-0 bg-(--bg-surface-secondary)" style={{ height: pct(hours.open) }} />
      <div aria-hidden className="absolute inset-x-0 bottom-0 bg-(--bg-surface-secondary)" style={{ top: pct(hours.close) }} />

      {rows.map((h, i) => {
        const cls = cn("relative block w-full flex-1", i > 0 && "border-t border-(--border-secondary)");
        const bookable = h + 1 > hours.open && h < hours.close;
        if (!bookable) return <div key={h} aria-hidden className={cls} />;
        const at = Math.max(h, hours.open);
        return (
          <button
            key={h}
            type="button"
            data-calendar-slot
            aria-label={`New event on ${dayLabel(date)} at ${fmtHour(at)}`}
            onClick={() => onCreateAt(iso, at)}
            className={cn(cls, "group/slot text-left transition-colors hover:bg-(--bg-surface-hover)")}
          >
            <span className="invisible absolute top-1 left-1.5 inline-flex items-center gap-0.5 body-xs text-(--text-secondary) group-hover/slot:visible">
              <Plus className="size-3" />
              {fmtHour(at)}
            </span>
          </button>
        );
      })}

      {draftHour !== null ? (
        <div
          aria-hidden
          className="absolute z-30 flex items-start gap-1 rounded-(--radius-200) border-2 border-dashed border-(--border-focus) bg-(--bg-surface) px-2 py-1 body-sm-semibold shadow-(--shadow-300)"
          style={{
            top: `calc(${pct(draftHour)} + 1px)`,
            height: `calc(${100 / total}% - 2px)`,
            left: 2,
            right: SLOT_GUTTER_PX,
          }}
        >
          <Plus className="mt-0.5 size-3.5 shrink-0" />
          <span className="truncate">{`New event · ${fmtHour(draftHour)}`}</span>
        </div>
      ) : null}

      {timed.map((ev) => {
        const s = Math.max(ev.start, start);
        const e = Math.min(Math.max(ev.end, ev.start + 0.5), end);
        const { lane, lanes: count } = lanes.get(ev.key) ?? { lane: 0, lanes: 1 };
        return (
          <TimeGridEvent
            key={ev.key}
            ev={ev}
            past={isPast(ev, todayISO, nowHour)}
            selected={ev.key === selectedKey}
            onOpen={onOpenEvent}
            style={{
              top: `calc(${pct(s)} + 1px)`,
              height: `max(calc(${((e - s) / total) * 100}% - 2px), ${MIN_CARD_PX}px)`,
              left: `calc((100% - ${SLOT_GUTTER_PX}px) * ${lane / count} + 2px)`,
              width: `calc((100% - ${SLOT_GUTTER_PX}px) / ${count} - 2px)`,
            }}
          />
        );
      })}

      {isToday && nowHour !== null && nowHour >= start && nowHour <= end ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 z-30" style={{ top: pct(nowHour) }}>
          <div className="relative h-0.5 -translate-y-1/2 bg-(--bg-fill-critical)">
            <span className="absolute top-1/2 -left-[5px] size-2.5 -translate-y-1/2 rounded-(--radius-full) bg-(--bg-fill-critical)" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
