"use client";

import type * as React from "react";
import { Wrench } from "lucide-react";
import { RegPlate } from "@/components/shared/reg-plate";
import { fmtHour, type CalEvent } from "@/lib/calendar-model";
import { cn, formatRegPlate } from "@/lib/utils";
import { KIND_META, eventStatus, timeText } from "./event-meta";

export type OpenEvent = (ev: CalEvent, anchor: HTMLElement) => void;

/** One line per fact, for the native tooltip on every event. */
function tooltip(ev: CalEvent): string {
  const status = eventStatus(ev);
  return [
    ev.title,
    timeText(ev),
    ev.job,
    [ev.reg && formatRegPlate(ev.reg), ev.car].filter(Boolean).join(" · "),
    status.flag ? status.label : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function accessibleName(ev: CalEvent): string {
  const status = eventStatus(ev);
  return [
    `${KIND_META[ev.kind].singular}: ${ev.title}`,
    timeText(ev),
    ev.reg && formatRegPlate(ev.reg),
    status.flag ? status.label : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Card colours for the four looks: resting, finished, called off, open. */
function cardTone(ev: CalEvent, past: boolean, selected: boolean) {
  const meta = KIND_META[ev.kind];
  const status = eventStatus(ev);
  if (selected) return { card: meta.selected, tint: "opacity-80", muted: "opacity-80", quiet: false, struck: false };
  if (status.struck) {
    return {
      card: "border border-dashed border-(--border) bg-(--bg-surface) text-(--text-secondary) hover:bg-(--bg-surface-hover)",
      tint: "text-(--text-secondary)",
      muted: "text-(--text-secondary)",
      quiet: true,
      struck: true,
    };
  }
  // Finished events keep their colour, so a mostly-past week still reads by
  // source, but their text and accent bar step back.
  if (past || status.done) {
    return {
      card: cn(meta.surface, "text-(--text-secondary)"),
      tint: "text-(--text-secondary)",
      muted: "text-(--text-secondary)",
      quiet: true,
      struck: false,
    };
  }
  return { card: cn(meta.surface, "text-(--text)"), tint: meta.tint, muted: "text-(--text-secondary)", quiet: false, struck: false };
}

/**
 * An event on the day and week grids. The card sizes itself to its time slot
 * and container queries decide what fits. A half-hour slot gets one line:
 * time and name, plus the job and plate when the card is wide (day view).
 * From two lines it adds the time and the plate; taller cards add the job
 * and the car. Finished events keep their colour with quieter text,
 * cancelled ones are outlined and struck through, and the open event fills
 * with its colour.
 */
export function TimeGridEvent({
  ev,
  past,
  selected,
  style,
  onOpen,
}: {
  ev: CalEvent;
  past: boolean;
  selected: boolean;
  style: React.CSSProperties;
  onOpen: OpenEvent;
}) {
  const meta = KIND_META[ev.kind];
  const status = eventStatus(ev);
  const tone = cardTone(ev, past, selected);
  const StatusIcon = status.Icon;
  const plate = ev.reg ? (
    // A tighter plate than the "sm" size, so it fits beside the time in a
    // week column.
    <RegPlate registration={ev.reg} size="sm" className="shrink-0 px-1 py-px tracking-[0.04em]" />
  ) : null;
  const statusIcon = status.flag ? (
    <StatusIcon aria-hidden className={cn("size-3.5 shrink-0", !selected && status.iconTone)} />
  ) : null;

  return (
    <button
      type="button"
      data-event-key={ev.key}
      aria-label={accessibleName(ev)}
      title={tooltip(ev)}
      onClick={(e) => onOpen(ev, e.currentTarget)}
      style={style}
      className={cn(
        "absolute overflow-hidden rounded-(--radius-200) text-left transition-colors duration-100",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus)",
        tone.card,
        selected && "z-20 shadow-(--shadow-300)",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-[3px] left-[3px] w-[3px] rounded-(--radius-full)",
          selected ? "bg-current opacity-50" : meta.accent,
          tone.quiet && "opacity-40",
        )}
      />
      <span className="absolute inset-0 flex flex-col py-[3px] pr-1.5 pl-2.5 [container-type:size]">
        {/* Line 1: the name. On a one-line card the time sits in front of it
            and, when wide, the job and plate follow. */}
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              // A narrow lane keeps the name and drops the time.
              "shrink-0 body-sm tabular-nums [@container(max-width:90px)]:hidden [@container(min-height:38px)]:hidden",
              tone.tint,
            )}
          >
            {fmtHour(ev.start)}
          </span>
          <span className={cn("min-w-0 truncate body-sm-semibold", tone.struck && "line-through")}>
            {ev.title}
          </span>
          {ev.job ? (
            <span className={cn("hidden min-w-0 truncate body-sm [@container(min-width:320px)_and_(max-height:37.98px)]:inline", tone.muted)}>
              {ev.job}
            </span>
          ) : null}
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            {plate ? (
              <span className="hidden [@container(min-width:320px)_and_(max-height:37.98px)]:inline-flex">{plate}</span>
            ) : null}
            {statusIcon}
          </span>
        </span>

        {/* Line 2: when, the status if it's notable, and the plate. */}
        <span className={cn("hidden min-w-0 items-center gap-1.5 body-sm tabular-nums [@container(min-height:38px)]:flex", tone.tint)}>
          <span className="shrink-0 [@container(min-width:170px)]:hidden">{fmtHour(ev.start)}</span>
          <span className="hidden shrink-0 [@container(min-width:170px)]:inline">{timeText(ev)}</span>
          {status.flag ? (
            <span className="hidden min-w-0 truncate [@container(min-width:240px)]:inline">{`· ${status.label}`}</span>
          ) : null}
          {plate ? (
            <span className="hidden [@container(min-width:104px)]:inline-flex">{plate}</span>
          ) : null}
        </span>

        {/* Lines 3 and 4: the job (walk-ins) and the car. */}
        {ev.job ? (
          <span className={cn("hidden truncate body-sm [@container(min-height:54px)]:block", tone.muted)}>{ev.job}</span>
        ) : null}
        {ev.car ? (
          <span
            className={cn(
              "hidden truncate body-sm",
              ev.job ? "[@container(min-height:70px)]:block" : "[@container(min-height:54px)]:block",
              tone.muted,
            )}
          >
            {ev.car}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/** An event in a month cell: colour dot, start time and name. */
export function MonthEventChip({
  ev,
  past,
  selected,
  onOpen,
}: {
  ev: CalEvent;
  past: boolean;
  selected: boolean;
  onOpen: OpenEvent;
}) {
  if (ev.allDay) return <AllDayChip ev={ev} past={past} selected={selected} onOpen={onOpen} />;
  const meta = KIND_META[ev.kind];
  const status = eventStatus(ev);
  const quiet = past || status.done;
  return (
    <button
      type="button"
      data-event-key={ev.key}
      aria-label={accessibleName(ev)}
      title={tooltip(ev)}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(ev, e.currentTarget);
      }}
      className={cn(
        "flex w-full min-w-0 shrink-0 items-center gap-1.5 rounded-(--radius-150) px-1.5 py-0.5 text-left body-sm transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus)",
        selected ? meta.selected : "hover:bg-(--bg-surface-hover)",
      )}
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-(--radius-full)", selected ? "bg-current" : meta.accent, quiet && !selected && "opacity-40")} />
      <span className={cn("shrink-0 tabular-nums", selected ? "opacity-80" : "text-(--text-secondary)")}>
        {fmtHour(ev.start)}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          !selected && (quiet ? "text-(--text-secondary)" : "text-(--text) body-sm-semibold"),
          status.struck && "line-through",
        )}
      >
        {ev.title}
      </span>
    </button>
  );
}

/** Maintenance due on a day with no time booked: a filled pill with a wrench. */
export function AllDayChip({
  ev,
  past,
  selected,
  onOpen,
}: {
  ev: CalEvent;
  past: boolean;
  selected: boolean;
  onOpen: OpenEvent;
}) {
  const meta = KIND_META[ev.kind];
  const status = eventStatus(ev);
  const quiet = past || status.done;
  const StatusIcon = status.Icon;
  return (
    <button
      type="button"
      data-event-key={ev.key}
      aria-label={accessibleName(ev)}
      title={tooltip(ev)}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(ev, e.currentTarget);
      }}
      className={cn(
        "flex w-full min-w-0 shrink-0 items-center gap-1.5 rounded-(--radius-150) px-1.5 py-0.5 text-left body-sm transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus)",
        selected
          ? meta.selected
          : quiet
            ? cn(meta.surface, "text-(--text-secondary)")
            : cn(meta.surface, meta.tint),
      )}
    >
      <Wrench aria-hidden className="size-3 shrink-0" />
      <span className={cn("min-w-0 flex-1 truncate", !quiet && "body-sm-semibold")}>{ev.title}</span>
      {status.flag ? <StatusIcon aria-hidden className={cn("size-3 shrink-0", !selected && status.iconTone)} /> : null}
    </button>
  );
}
