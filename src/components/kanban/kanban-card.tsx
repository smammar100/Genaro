"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Avatar } from "@/components/genaro";
import { RegPlate } from "@/components/shared/reg-plate";
import { cn } from "@/lib/utils";
import { StageIcon, type KanbanColumn } from "./stage-icon";

export type KanbanTextTone = "default" | "muted" | "caution" | "critical" | "success";

/** One line of the card: an icon, the value, and a quieter detail after it. */
export interface KanbanFact {
  icon: LucideIcon;
  text: React.ReactNode;
  detail?: React.ReactNode;
  tone?: KanbanTextTone;
  /** The full meaning on hover, e.g. "Was due Sun 27 Sept". */
  title?: string;
}

export interface KanbanCardProps {
  /** The vehicle thumbnail, beside the identity. */
  thumbnail?: React.ReactNode;
  /** The top line: the reg plate, as a `KanbanPlate`. */
  identity: React.ReactNode;
  /** The job number or stock ID, after the vehicle's name. */
  reference?: string;
  /** The vehicle's name, on the line under the plate. It wraps rather than truncates. */
  vehicle?: string;
  /** The card's title. Make it the link or button that opens the record, so keyboard users can open it. */
  title: React.ReactNode;
  /** The title as plain text, shown on hover in case two lines cut it short. */
  titleText?: string;
  /** The fact lines, most urgent first: the date, then the garage or phone, then the rest. */
  facts?: (KanbanFact | null | undefined | false)[];
  /** Why the card is stuck (stalled, lost), as a tinted note. */
  note?: { icon: LucideIcon; text: string; tone: "caution" | "critical" };
  /** Footer chip: who owns the card, avatar and name; `empty` ("Unassigned") when nobody does. */
  person?: { name?: string | null; empty: string };
  /** Footer chip, right: the headline amount and, in a word, what kind it is ("estimate", "agreed"). */
  money?: { value: string; kind?: string; title?: string };
  /** The card's menu, top right: the record's own actions (edit, delete, view). */
  menu?: React.ReactNode;
  /** The footer's last row, e.g. a "Generate invoice" button. */
  action?: React.ReactNode;
  /**
   * A one-tap action that's always visible, unlike the menu: an icon button
   * at the footer's right end, e.g. booking an appointment.
   */
  quickAction?: React.ReactNode;
  /** Clicking the card anywhere outside its own links and buttons opens it. */
  onOpen?: () => void;
}

const TEXT_TONE: Record<KanbanTextTone, string> = {
  default: "text-(--text)",
  muted: "text-(--text-secondary)",
  caution: "text-(--text-caution)",
  critical: "text-(--text-critical)",
  success: "text-(--text-success)",
};

const NOTE_TONE = {
  caution: "bg-(--bg-surface-caution) text-(--text-caution)",
  critical: "bg-(--bg-surface-critical) text-(--text-critical)",
};

/** Long unbroken strings (a pasted part number, a URL) wrap instead of pushing the card wider. */
const WRAP_ANYWHERE = "[overflow-wrap:anywhere]";

/**
 * The board's card surface: a white card with a soft drop and halo on the
 * board, a little more of both on hover, a focus-tinted ring when something
 * inside it has keyboard focus. Board cards built without `KanbanCard` (the
 * prep board's) use it so every board's cards match.
 */
export const KANBAN_CARD_SURFACE =
  "group/card relative flex min-w-0 flex-col overflow-clip rounded-(--radius-400) bg-(--bg-surface) shadow-(--kanban-card-shadow) transition-shadow duration-150 ease-out hover:shadow-(--kanban-card-shadow-hover) has-focus-visible:shadow-(--kanban-card-shadow-lift)";

/** A footer pill: an icon or avatar, then a short value, on a faint fill with no outline. */
export const KANBAN_CHIP =
  "body-sm inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-(--radius-full) bg-(--bg-fill-transparent) px-2.5 text-(--text-secondary)";

/**
 * The column a card sits in, given by the board so a card can show its
 * status glyph without each page passing it in.
 */
export const KanbanCardContext = React.createContext<{
  column: KanbanColumn;
  columns: KanbanColumn[];
} | null>(null);

/**
 * The board's card, after the reference board: a body led by the column's
 * status glyph and the title, then a quiet meta line and the fact lines; a
 * footer of pill chips for who owns it and what it's worth. The vehicle's
 * plate sits up top beside an optional thumbnail; the date carries the
 * urgency in words and tone rather than a red card.
 *
 * Built to hold at a 248px card with any data: the vehicle, facts and notes
 * wrap (a car's name is never cut), the title clamps to two lines with the
 * full text on hover, and the footer chips wrap, the owner's name ellipsing
 * before the amount does.
 * @import import { KanbanCard } from "@/components/kanban/kanban-card";
 */
export function KanbanCard({
  thumbnail,
  identity,
  reference,
  vehicle,
  title,
  titleText,
  facts,
  note,
  person,
  money,
  menu,
  action,
  quickAction,
  onOpen,
}: KanbanCardProps) {
  const lines = (facts ?? []).filter((f): f is KanbanFact => Boolean(f));
  const NoteIcon = note?.icon;
  const place = React.useContext(KanbanCardContext);
  return (
    <article
      data-kanban-card=""
      onClick={
        onOpen
          ? (e) => {
              if ((e.target as HTMLElement).closest("a,button,input,[role=menuitem]")) return;
              onOpen();
            }
          : undefined
      }
      className={cn(KANBAN_CARD_SURFACE, "cursor-grab active:cursor-grabbing")}
    >
      {/* Pinned in the card's top-right corner, clear of the content. With a
          mouse it stays quiet until the card is hovered or focused, or while
          its menu is open; on touch it's always there. */}
      {menu ? (
        <div className="absolute right-2 top-2 z-10 transition-opacity duration-150 pointer-fine:opacity-0 pointer-fine:group-hover/card:opacity-100 pointer-fine:has-focus-visible:opacity-100 pointer-fine:has-[[data-state=open]]:opacity-100">
          {menu}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-2 p-4">
        <div className={cn("flex min-w-0 items-center gap-2.5", menu && "pr-7")}>
          {thumbnail ? (
            // Not a target of its own: a press on the photo drags or opens the card.
            <span className="pointer-events-none shrink-0 select-none">{thumbnail}</span>
          ) : null}
          <div className="flex min-h-6 min-w-0 items-center">{identity}</div>
        </div>

        <div className="flex min-w-0 items-start gap-1.5">
          {place ? (
            <StageIcon column={place.column} columns={place.columns} className="mt-[3px]" />
          ) : null}
          <div title={titleText} className={cn("body-md-semibold line-clamp-2 min-w-0 flex-1", WRAP_ANYWHERE)}>
            {title}
          </div>
        </div>

        {/* The reference shares the vehicle's line, which wraps, so neither
            is ever cut to an ellipsis. */}
        {vehicle || reference ? (
          <p className={cn("body-sm flex flex-wrap items-center gap-x-2 gap-y-0.5 text-(--text-secondary)", WRAP_ANYWHERE)}>
            {vehicle ? <span>{vehicle}</span> : null}
            {vehicle && reference ? (
              <span aria-hidden className="size-[3px] shrink-0 rounded-(--radius-full) bg-(--border-tertiary)" />
            ) : null}
            {reference ? <span className="whitespace-nowrap tabular-nums">{reference}</span> : null}
          </p>
        ) : null}

        {lines.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-1 pt-0.5">
            {lines.map((f, i) => {
              const Icon = f.icon;
              const tone = f.tone ?? "default";
              const loud = tone === "caution" || tone === "critical";
              return (
                <p key={i} title={f.title} className={cn("body-sm flex min-w-0 items-start gap-1.5", TEXT_TONE[tone])}>
                  <Icon
                    aria-hidden
                    className={cn("mt-0.5 size-3.5 shrink-0", tone === "default" || tone === "muted" ? "text-(--icon-secondary)" : null)}
                  />
                  <span className={cn("min-w-0", WRAP_ANYWHERE)}>
                    <span className={loud ? "font-semibold" : undefined}>{f.text}</span>
                    {f.detail ? <span className="text-(--text-secondary)">{" · "}{f.detail}</span> : null}
                  </span>
                </p>
              );
            })}
          </div>
        ) : null}

        {note && NoteIcon ? (
          <p
            title={note.text}
            className={cn("body-sm flex min-w-0 items-start gap-1.5 rounded-(--radius-300) px-2.5 py-2", NOTE_TONE[note.tone])}
          >
            <NoteIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span className={cn("line-clamp-3 min-w-0", WRAP_ANYWHERE)}>{note.text}</span>
          </p>
        ) : null}
      </div>

      {person || money || action || quickAction ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-(--border-secondary) px-4 py-3">
          {person ? (
            // A long name ellipses (full name on hover) before the amount
            // gives up any room.
            <span title={person.name ?? person.empty} className={cn(KANBAN_CHIP, person.name && "pl-1")}>
              {/* The name is right beside it; the avatar is decoration. */}
              {person.name ? (
                <span aria-hidden className="inline-flex shrink-0">
                  <Avatar size="xs" name={person.name} />
                </span>
              ) : null}
              <span className={cn("min-w-0 truncate", person.name && "text-(--text)")}>
                {person.name ?? person.empty}
              </span>
            </span>
          ) : null}
          {money ? (
            <span title={money.title} className={cn(KANBAN_CHIP, "ml-auto shrink-0")}>
              <span className="body-sm-semibold truncate whitespace-nowrap tabular-nums text-(--text)">{money.value}</span>
              {money.kind ? <span className="truncate">{money.kind}</span> : null}
            </span>
          ) : null}
          {quickAction ? (
            <span className={cn("inline-flex shrink-0", !money && "ml-auto")}>{quickAction}</span>
          ) : null}
          {action ? <div className="basis-full">{action}</div> : null}
        </div>
      ) : null}
    </article>
  );
}

/**
 * The card's reg plate, linking to the vehicle when `href` is given. It never
 * pushes the card wider: an unusually long registration ellipses.
 * @import import { KanbanPlate } from "@/components/kanban/kanban-card";
 */
export function KanbanPlate({
  registration,
  href,
  title,
}: {
  registration: string;
  href?: string;
  title?: string;
}) {
  const plate = (
    <RegPlate registration={registration} size="sm" className="max-w-full truncate align-middle" />
  );
  return href ? (
    <Link
      href={href}
      draggable={false}
      title={title}
      className="inline-flex max-w-full shrink-0 transition-opacity hover:opacity-80"
    >
      {plate}
    </Link>
  ) : (
    <span className="inline-flex max-w-full shrink-0">{plate}</span>
  );
}
