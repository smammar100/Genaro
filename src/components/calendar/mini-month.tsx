"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/genaro";
import { MONTHS, addMonthsClamped, buildMonthGrid, dayLabel, toISO } from "@/lib/calendar-model";
import { cn } from "@/lib/utils";

/** Two-letter weekday heads, Monday first like the rest of the calendar. */
const HEADS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * A small month for the day view's side panel, after Untitled UI
 * (2026-11-07): pick a day to open it, a dot under each day with something
 * booked, today in bold and the open day in a brand-filled circle. Its own
 * arrows page through months without moving the day in view.
 */
export function MiniMonth({
  selected,
  todayISO,
  busy,
  onPick,
}: {
  /** The day the calendar is on. */
  selected: Date;
  todayISO: string;
  /** Dates (YYYY-MM-DD) with at least one event. */
  busy: Set<string>;
  onPick: (d: Date) => void;
}) {
  // The month shown follows the open day until you page away with the arrows
  // (adjust-state-on-prop-change, in render).
  const selectedMonth = `${selected.getFullYear()}-${selected.getMonth()}`;
  const [shownFor, setShownFor] = useState(selectedMonth);
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  if (shownFor !== selectedMonth) {
    setShownFor(selectedMonth);
    setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }

  const weeks = buildMonthGrid(month);
  const selectedISO = toISO(selected);

  return (
    <div className="flex shrink-0 flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="tertiary"
          icon={<ChevronLeft className="size-4" />}
          accessibilityLabel="Previous month"
          onClick={() => setMonth((m) => addMonthsClamped(m, -1))}
        />
        <span className="heading-sm">{`${MONTHS[month.getMonth()]} ${month.getFullYear()}`}</span>
        <Button
          variant="tertiary"
          icon={<ChevronRight className="size-4" />}
          accessibilityLabel="Next month"
          onClick={() => setMonth((m) => addMonthsClamped(m, 1))}
        />
      </div>
      <div className="grid grid-cols-7 text-center">
        {HEADS.map((h) => (
          <span key={h} className="py-1 body-sm text-(--text-secondary)">
            {h}
          </span>
        ))}
        {weeks.flat().map((d) => {
          const iso = toISO(d);
          const inMonth = d.getMonth() === month.getMonth();
          const isSelected = iso === selectedISO;
          const isToday = iso === todayISO;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPick(d)}
              aria-label={`Open ${dayLabel(d)}`}
              aria-current={isSelected ? "date" : undefined}
              className={cn(
                "relative mx-auto my-0.5 grid size-8 place-items-center rounded-(--radius-full) body-sm tabular-nums transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus)",
                isSelected
                  ? "bg-(--bg-fill-brand) text-(--text-brand-on-bg-fill)"
                  : cn("hover:bg-(--bg-surface-hover)", inMonth ? "text-(--text)" : "text-(--text-disabled)"),
                isToday && !isSelected && "font-semibold",
              )}
            >
              {d.getDate()}
              {busy.has(iso) ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-(--radius-full)",
                    isSelected ? "bg-(--text-brand-on-bg-fill)" : inMonth ? "bg-(--bg-fill-brand)" : "bg-(--bg-fill-disabled)",
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
