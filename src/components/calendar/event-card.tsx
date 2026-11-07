"use client";

import type * as React from "react";
import { Wrench } from "lucide-react";
import { RegPlate } from "@/components/shared/reg-plate";
import { fmtHour, type CalEvent } from "@/lib/calendar-model";
import { LEAD_TYPE_LABELS } from "@/lib/types";
import { cn, formatRegPlate } from "@/lib/utils";
import { KIND_META, eventStatus, timeText } from "./event-meta";

export type OpenEvent = (ev: CalEvent, anchor: HTMLElement) => void;

/** "Lead: Collection", for an appointment booked from a lead. */
const leadText = (ev: CalEvent) => (ev.leadType ? `Lead: ${LEAD_TYPE_LABELS[ev.leadType]}` : null);

/** One line per fact, for the native tooltip on every event. */
function tooltip(ev: CalEvent): string {
  const status = eventStatus(ev);
  return [
    ev.title,
    timeText(ev),
    leadText(ev),
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
    leadText(ev),
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
  if (selected) return { card: cn(meta.selected, "ring-transparent"), tint: "", muted: "opacity-80", struck: false };
  if (status.struck) {
    return {
      card: "ring-(--border) bg-(--bg-surface) text-(--text-secondary) hover:bg-(--bg-surface-hover)",
      tint: "text-(--text-secondary)",
      muted: "text-(--text-secondary)",
      struck: true,
    };
  }
  // Finished events keep their colour, so a mostly-past week still reads by
  // source, but their words step back.
  if (past || status.done) {
    return { card: cn(meta.surface, meta.ring), tint: "text-(--text-secondary)", muted: "text-(--text-secondary)", struck: false };
  }
  return { card: cn(meta.surface, meta.ring), tint: meta.tint, muted: "text-(--text-secondary)", struck: false };
}

/**
 * An event on the day and week grids, after Untitled UI's calendar
 * (2026-11-07): a tinted card with a 1px border a step darker, the name in
 * the source's colour and the time under it. The card sizes itself to its
 * slot and container queries decide what fits: a half-hour card is one line,
 * the name with the time at its end; taller cards add the time on its own
 * line, then the plate and lead type, the job and the car. Finished events
 * keep their colour with quieter words, cancelled ones are outlined and
 * struck through, and the open event fills with its colour.
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
  const status = eventStatus(ev);
  const tone = cardTone(ev, past, selected);
  const StatusIcon = status.Icon;
  const plate = ev.reg ? (
    // A tighter plate than the "sm" size, so it fits a week column.
    <RegPlate registration={ev.reg} size="sm" className="shrink-0 px-1 py-px" />
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
        "absolute overflow-hidden rounded-(--radius-150) text-left ring-1 ring-inset transition-colors duration-100",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus)",
        tone.card,
        selected && "z-20 shadow-(--shadow-300)",
      )}
    >
      <span className="absolute inset-0 flex flex-col gap-0.5 px-2 py-1.5 [container-type:size]">
        {/* Line 1: the name; on a one-line card the time sits at its end. */}
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn("min-w-0 truncate body-sm-semibold", tone.tint, tone.struck && "line-through")}>
            {ev.title}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className={cn("body-sm tabular-nums [@container(min-height:34px)]:hidden", tone.tint)}>
              {fmtHour(ev.start)}
            </span>
            {statusIcon}
          </span>
        </span>

        {/* Line 2: the time. */}
        <span className={cn("hidden truncate body-sm tabular-nums [@container(min-height:34px)]:block", tone.tint)}>
          {timeText(ev)}
        </span>

        {/* Line 3: the plate and, with room, the lead type and a notable
            status. A week column has room for the type alone ("Collection");
            a wide card names it ("Lead: Collection"). */}
        {plate || ev.leadType ? (
          <span className="hidden min-w-0 items-center gap-1.5 body-sm [@container(min-height:54px)]:flex">
            {plate}
            {ev.leadType ? (
              <span className={cn("hidden min-w-0 truncate [@container(min-width:128px)]:inline", tone.muted)}>
                <span className="[@container(min-width:200px)]:hidden">{LEAD_TYPE_LABELS[ev.leadType]}</span>
                <span className="hidden [@container(min-width:200px)]:inline">{leadText(ev)}</span>
              </span>
            ) : null}
            {status.flag ? (
              <span className={cn("hidden min-w-0 truncate [@container(min-width:240px)]:inline", tone.muted)}>{status.label}</span>
            ) : null}
          </span>
        ) : null}

        {/* Line 4: the job (walk-ins); line 5 the car. */}
        {ev.job ? (
          <span className={cn("hidden truncate body-sm [@container(min-height:72px)]:block", tone.muted)}>{ev.job}</span>
        ) : null}
        {ev.car ? (
          <span
            className={cn(
              "hidden truncate body-sm",
              ev.job ? "[@container(min-height:90px)]:block" : "[@container(min-height:72px)]:block",
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

/**
 * An event in a month cell, as Untitled UI draws one: a tinted chip, the name
 * and the start time at its end. The name wraps to a second line rather than
 * being cut short (2026-11-07).
 */
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
  const tone = cardTone(ev, past, selected);
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
        "flex w-full min-w-0 shrink-0 items-start gap-1 rounded-(--radius-150) px-1.5 py-1 text-left body-sm ring-1 ring-inset transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus)",
        tone.card,
      )}
    >
      <span className={cn("line-clamp-2 min-w-0 flex-1 body-sm-semibold [overflow-wrap:anywhere]", tone.tint, tone.struck && "line-through")}>
        {ev.title}
      </span>
      <span className={cn("shrink-0 tabular-nums", tone.tint)}>{fmtHour(ev.start)}</span>
    </button>
  );
}

/** Maintenance due on a day with no time booked: a chip like the others, with a wrench for the time; the name wraps to two lines. */
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
  const status = eventStatus(ev);
  const tone = cardTone(ev, past, selected);
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
        "flex w-full min-w-0 shrink-0 items-start gap-1.5 rounded-(--radius-150) px-1.5 py-1 text-left body-sm ring-1 ring-inset transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus)",
        tone.card,
      )}
    >
      <Wrench aria-hidden className={cn("mt-0.5 size-3 shrink-0", tone.tint)} />
      <span className={cn("line-clamp-2 min-w-0 flex-1 body-sm-semibold [overflow-wrap:anywhere]", tone.tint)}>{ev.title}</span>
      {status.flag ? <StatusIcon aria-hidden className={cn("size-3 shrink-0", !selected && status.iconTone)} /> : null}
    </button>
  );
}
