"use client";

import { useMemo } from "react";
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

// A day shows up to four events, or three and "N more" (2026-11-07). Rows
// grow to fit what their days hold, and stretch to fill the card when they
// hold little.
const FITS = 4;

/**
 * Month view, after Untitled UI (2026-11-07): Monday-first weeks, the date
 * at each cell's top left, today's in a brand-filled circle, days from the
 * neighbouring months dimmed. A day shows up to three events; a busier day
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
  // Group once rather than scanning every event for each of the 42 cells; the
  // grid re-renders on every popover open and clock tick.
  const byDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    for (const list of map.values()) list.sort(byStart);
    return map;
  }, [events]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="grid min-w-[640px] shrink-0 grid-cols-7 border-b border-(--border-secondary)">
        {DOW.map((d, i) => (
          <div key={d} className={cn("px-2 py-2 text-center body-sm text-(--text-secondary)", i > 0 && "border-l border-(--border-secondary)")}>
            {d}
          </div>
        ))}
      </div>
      <div
        // At least the card's height, and taller when a week's days hold more
        // than fits: the rows size to their days and the view scrolls.
        className="grid min-w-[640px] flex-[1_0_auto] grid-cols-7"
        style={{ gridTemplateRows: `repeat(${weeks.length}, auto)` }}
      >
        {cells.map((d, idx) => {
          const iso = toISO(d);
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = iso === todayISO;
          const dayEvents = byDate.get(iso) ?? [];
          const shown = dayEvents.length > FITS ? dayEvents.slice(0, FITS - 1) : dayEvents;
          const more = dayEvents.length - shown.length;
          return (
            <div
              key={iso}
              className={cn(
                "relative flex min-h-[116px] min-w-0 flex-col gap-1 p-1.5 [&>*]:shrink-0",
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
              <div className="relative flex shrink-0 justify-start">
                <button
                  type="button"
                  onClick={() => onOpenDay(d)}
                  aria-label={`Open ${dayLabel(d)}`}
                  className={cn(
                    "grid h-6 min-w-6 place-items-center rounded-(--radius-full) px-1.5 body-sm tabular-nums transition-colors",
                    isToday
                      ? "bg-(--bg-fill-brand) body-sm-semibold text-(--text-brand-on-bg-fill) hover:bg-(--bg-fill-brand-hover)"
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
                  className="relative self-start rounded-(--radius-100) px-1.5 body-sm text-(--text-secondary) hover:text-(--text)"
                >
                  {`${more} more…`}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
