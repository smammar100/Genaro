"use client";

import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { Badge, Button, ButtonGroup } from "@/components/polaris";
import { fmtHour, type BusinessHours, type Kind, type ViewKey } from "@/lib/calendar-model";
import { cn } from "@/lib/utils";
import { KIND_META } from "./event-meta";

const VIEWS: { key: ViewKey; label: string; shortcut: string }[] = [
  { key: "day", label: "Day", shortcut: "D" },
  { key: "week", label: "Week", shortcut: "W" },
  { key: "month", label: "Month", shortcut: "M" },
];

/** Today, back and forward, the range, the view switch and the create action. */
export function CalendarToolbar({
  label,
  view,
  isToday,
  ctaLabel,
  onToday,
  onStep,
  onView,
  onCreate,
}: {
  label: string;
  view: ViewKey;
  /** Day view is showing today. */
  isToday: boolean;
  ctaLabel: string;
  onToday: () => void;
  onStep: (dir: -1 | 1) => void;
  onView: (view: ViewKey) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-(--border-secondary) px-4 py-3">
      <Button onClick={onToday} title="Today (T)">
        Today
      </Button>
      <ButtonGroup gap="tight">
        <Button
          variant="tertiary"
          icon={<ChevronLeft className="size-4" />}
          accessibilityLabel={`Previous ${view}`}
          title={`Previous ${view} (←)`}
          onClick={() => onStep(-1)}
        />
        <Button
          variant="tertiary"
          icon={<ChevronRight className="size-4" />}
          accessibilityLabel={`Next ${view}`}
          title={`Next ${view} (→)`}
          onClick={() => onStep(1)}
        />
      </ButtonGroup>
      <h2 className="min-w-0 truncate heading-md">{label}</h2>
      {view === "day" && isToday ? <Badge tone="info">Today</Badge> : null}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <ButtonGroup variant="segmented">
          {VIEWS.map((v) => (
            <Button
              key={v.key}
              pressed={view === v.key}
              title={`${v.label} view (${v.shortcut})`}
              onClick={() => onView(v.key)}
            >
              {v.label}
            </Button>
          ))}
        </ButtonGroup>
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={onCreate}>
          {ctaLabel}
        </Button>
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
