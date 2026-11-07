"use client";

import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button, ButtonGroup, Select } from "@/components/genaro";
import { MONTHS, fmtHour, viewHeading, type BusinessHours, type Kind, type ViewKey } from "@/lib/calendar-model";
import { cn } from "@/lib/utils";
import { KIND_META } from "./event-meta";

const VIEWS: { value: ViewKey; label: string }[] = [
  { value: "day", label: "Day view" },
  { value: "week", label: "Week view" },
  { value: "month", label: "Month view" },
];

/**
 * The calendar's header, after Untitled UI (2026-11-07): today as a tear-off
 * date, the month and the range in view under it (no week number), then
 * back / Today / forward as one control and the view picker. The create action
 * is the page header's primary button. Shortcuts: T today, arrows to move,
 * D / W / M for the views.
 */
export function CalendarToolbar({
  view,
  anchor,
  today,
  onToday,
  onStep,
  onView,
}: {
  view: ViewKey;
  /** The date the view is on. */
  anchor: Date;
  /** Today, once the clock has started (null on the server). */
  today: Date | null;
  onToday: () => void;
  onStep: (dir: -1 | 1) => void;
  onView: (view: ViewKey) => void;
}) {
  const { title, detail } = viewHeading(view, anchor);
  const tile = today ?? anchor;
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-(--border-secondary) px-4 py-3">
      {/* Today as a tear-off date: the month over the day. */}
      <div
        aria-hidden
        className="flex w-12 shrink-0 flex-col items-center overflow-hidden rounded-(--radius-200) ring-1 ring-inset ring-(--border-secondary)"
      >
        <span className="w-full bg-(--bg-surface-secondary) py-0.5 text-center body-sm text-(--text-secondary)" suppressHydrationWarning>
          {MONTHS[tile.getMonth()].slice(0, 3)}
        </span>
        <span className="py-0.5 heading-md tabular-nums" suppressHydrationWarning>
          {tile.getDate()}
        </span>
      </div>
      <div className="min-w-0">
        <h2 className="truncate heading-md">{title}</h2>
        <p className="truncate body-sm text-(--text-secondary)">{detail}</p>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <ButtonGroup variant="segmented">
          <Button
            icon={<ChevronLeft className="size-4" />}
            accessibilityLabel={`Previous ${view}`}
            title={`Previous ${view} (←)`}
            onClick={() => onStep(-1)}
          />
          <Button onClick={onToday} title="Today (T)">
            Today
          </Button>
          <Button
            icon={<ChevronRight className="size-4" />}
            accessibilityLabel={`Next ${view}`}
            title={`Next ${view} (→)`}
            onClick={() => onStep(1)}
          />
        </ButtonGroup>
        <div className="w-36">
          <Select label="View" labelHidden options={VIEWS} value={view} onChange={(v) => onView(v as ViewKey)} />
        </div>
      </div>
    </div>
  );
}

/**
 * Filter chips with a count for each source in view (only when the calendar
 * shows more than one), and the opening hours.
 */
export function CalendarFilters({
  kinds,
  active,
  counts,
  hours,
  onToggle,
}: {
  kinds: Kind[];
  active: Set<Kind>;
  counts: Record<Kind, number>;
  hours: BusinessHours;
  onToggle: (kind: Kind) => void;
}) {
  const only = kinds.length === 1 ? kinds[0] : null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-(--border-secondary) px-4 py-2">
      {only ? (
        <span className="body-sm text-(--text-secondary)">
          {`${counts[only]} ${KIND_META[only].singular.toLowerCase()}${counts[only] === 1 ? "" : "s"} in view`}
        </span>
      ) : (
        kinds.map((k) => {
          const on = active.has(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(k)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-(--radius-full) border px-3 py-1 body-sm transition-colors hover:bg-(--bg-surface-hover)",
                on
                  ? "border-(--border) bg-(--bg-surface) text-(--text)"
                  : "border-dashed border-(--border-secondary) text-(--text-secondary)",
              )}
            >
              <span aria-hidden className={cn("size-2 rounded-(--radius-full)", on ? KIND_META[k].accent : "bg-(--bg-fill-disabled)")} />
              {KIND_META[k].label}
              <span className="tabular-nums text-(--text-secondary)">{counts[k]}</span>
            </button>
          );
        })
      )}
      <span className="ml-auto inline-flex items-center gap-1.5 body-sm text-(--text-secondary)">
        <Clock aria-hidden className="size-3.5" />
        {`Open ${fmtHour(hours.open)} – ${fmtHour(hours.close)}`}
      </span>
    </div>
  );
}
