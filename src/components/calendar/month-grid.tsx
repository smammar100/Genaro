"use client";

import {
  DOW,
  MONTHS,
  buildMonthGrid,
  byStart,
  dayLabel,
  isPast,
  toISO,
  type CalEvent,
} from "@/lib/calendar-model";
import { cn } from "@/lib/utils";
import { MonthEventChip, type OpenEvent } from "./event-card";

// A cell always has room for three lines: three events, or two and "N more".
const FITS = 3;

/**
 * Month view: Monday-first weeks, days from the neighbouring months dimmed,
 * today's date in a red pill. A day shows up to three events; a busier day
 * shows two and "N more", which opens it in the day view, as does clicking
 * the date or an empty part of the cell.
 */
export function MonthGrid({
  anchor,
  events,
  todayISO,
  nowHour,
  selectedKey,
  onOpenDay,
  onOpenEvent,
}: {
  anchor: Date;
  events: CalEvent[];
  todayISO: string;
  nowHour: number | null;
  selectedKey: string | null;
  onOpenDay: (d: Date) => void;
  onOpenEvent: OpenEvent;
}) {
  const weeks = buildMonthGrid(anchor);
  const cells = weeks.flat();
  const lastRow = (weeks.length - 1) * 7;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="grid min-w-[640px] shrink-0 grid-cols-7 border-b border-(--border-secondary)">
        {DOW.map((d, i) => (
          <div key={d} className={cn("px-2 py-2 body-sm text-(--text-secondary)", i > 0 && "border-l border-(--border-secondary)")}>
            {d}
          </div>
        ))}
      </div>
      <div
        className="grid min-h-0 min-w-[640px] flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(100px, 1fr))` }}
      >
        {cells.map((d, idx) => {
          const iso = toISO(d);
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = iso === todayISO;
          const dayEvents = events.filter((e) => e.date === iso).sort(byStart);
          const shown = dayEvents.length > FITS ? dayEvents.slice(0, FITS - 1) : dayEvents;
          const more = dayEvents.length - shown.length;
          return (
            <div
              key={iso}
              className={cn(
                "relative flex min-h-0 min-w-0 flex-col gap-0.5 overflow-hidden p-1",
                idx % 7 > 0 && "border-l border-(--border-secondary)",
                idx < lastRow && "border-b border-(--border-secondary)",
                !inMonth && "bg-(--bg-surface-secondary)",
              )}
            >
              {/* The empty part of the cell opens the day too; keyboard users
                  get the same from the date button. */}
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                data-calendar-slot
                onClick={() => onOpenDay(d)}
                className="absolute inset-0 transition-colors hover:bg-(--bg-surface-hover)"
              />
              <div className="relative flex shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => onOpenDay(d)}
                  aria-label={`Open ${dayLabel(d)}`}
                  className={cn(
                    "grid h-6 min-w-6 place-items-center rounded-(--radius-full) px-1.5 body-sm tabular-nums transition-colors",
                    isToday
                      ? "bg-(--bg-fill-critical) body-sm-semibold text-(--text-critical-on-bg-fill) hover:bg-(--bg-fill-critical-hover)"
                      : cn("hover:bg-(--bg-surface-selected)", inMonth ? "text-(--text)" : "text-(--text-disabled)"),
                  )}
                >
                  {d.getDate() === 1 ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}` : d.getDate()}
                </button>
              </div>
              {shown.map((ev) => (
                <div key={ev.key} className="relative">
                  <MonthEventChip
                    ev={ev}
                    past={isPast(ev, todayISO, nowHour)}
                    selected={ev.key === selectedKey}
                    onOpen={onOpenEvent}
                  />
                </div>
              ))}
              {more > 0 ? (
                <button
                  type="button"
                  onClick={() => onOpenDay(d)}
                  className="relative self-start rounded-(--radius-100) px-1.5 body-xs-semibold text-(--text-secondary) hover:bg-(--bg-surface-selected)"
                >
                  {`${more} more`}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
