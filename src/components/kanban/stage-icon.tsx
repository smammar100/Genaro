import { cn } from "@/lib/utils";

export type KanbanTone =
  | "neutral"
  | "info"
  | "magic"
  | "caution"
  | "warning"
  | "emphasis"
  | "success"
  | "critical";

/**
 * Where a column sits on the board's path: `open` columns are the stages a
 * card walks through, `done` ends it, and an `exception` steps off it
 * (stalled, lost).
 */
export type KanbanColumnKind = "open" | "done" | "exception";

export interface KanbanColumn {
  /** The value the board's items carry, e.g. a status or stage slug. */
  id: string;
  label: string;
  tone: KanbanTone;
  kind: KanbanColumnKind;
  /** The exception glyph: a pause (stalled, waiting) or a cross (lost). */
  glyph?: "pause" | "cross";
  /** Shown after the count in the header, e.g. the column's total value. */
  summary?: string;
}

const TONE_ICON: Record<KanbanTone, string> = {
  neutral: "text-(--icon-secondary)",
  info: "text-(--icon-info)",
  magic: "text-(--icon-magic)",
  caution: "text-(--icon-caution)",
  warning: "text-(--icon-warning)",
  emphasis: "text-(--icon-emphasis)",
  success: "text-(--icon-success)",
  critical: "text-(--icon-critical)",
};

/** A pie slice of an `r`-radius disc centred in the 14px box, clockwise from 12 o'clock. */
function pie(fraction: number, r = 3.5): string {
  const angle = -Math.PI / 2 + fraction * 2 * Math.PI;
  const x = (7 + r * Math.cos(angle)).toFixed(2);
  const y = (7 + r * Math.sin(angle)).toFixed(2);
  return `M7 7 L7 ${7 - r} A${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x} ${y} Z`;
}

/** The badge's tile, filled in the column's tone; the glyph inside is cut in the surface colour. */
const TONE_TILE: Record<KanbanTone, string> = {
  neutral: "bg-(--icon-secondary)",
  info: "bg-(--icon-info)",
  magic: "bg-(--icon-magic)",
  caution: "bg-(--icon-caution)",
  warning: "bg-(--icon-warning)",
  emphasis: "bg-(--icon-emphasis)",
  success: "bg-(--icon-success)",
  critical: "bg-(--icon-critical)",
};

/** How far along the open columns this one sits, 0 for the first. */
function progress(column: KanbanColumn, columns: KanbanColumn[]) {
  const open = columns.filter((c) => c.kind === "open");
  const index = Math.max(0, open.findIndex((c) => c.id === column.id));
  return { index, fraction: index / Math.max(1, open.length) };
}

/**
 * The column's status glyph, derived from its place on the board so any set
 * of stages gets one without drawing icons per stage: a ring that fills as a
 * card walks the open columns (dashed for the first), a tick when done, and a
 * pause or a cross for columns off the path.
 *
 * `glyph` (the default) is the bare mark in the column's tone, for cards and
 * the hidden-columns rail. `badge` sets the same mark in a small filled tile,
 * for the column header (the reference board's status badge).
 */
export function StageIcon({
  column,
  columns,
  variant = "glyph",
  className,
}: {
  column: KanbanColumn;
  columns: KanbanColumn[];
  variant?: "glyph" | "badge";
  className?: string;
}) {
  if (variant === "badge") {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex size-3.5 shrink-0 items-center justify-center rounded-(--radius-100) text-(--bg-surface)",
          TONE_TILE[column.tone],
          className,
        )}
      >
        <BadgeMark column={column} columns={columns} />
      </span>
    );
  }
  const cls = cn("size-3.5 shrink-0", TONE_ICON[column.tone], className);
  if (column.kind === "done") {
    return (
      <svg viewBox="0 0 14 14" className={cls} aria-hidden>
        <circle cx="7" cy="7" r="6.25" fill="currentColor" />
        <path
          d="M4.3 7.1l1.9 1.9 3.6-3.8"
          fill="none"
          className="stroke-(--bg-surface)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (column.kind === "exception") {
    return (
      <svg viewBox="0 0 14 14" className={cls} aria-hidden>
        <circle cx="7" cy="7" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d={column.glyph === "cross" ? "M5.2 5.2l3.6 3.6M8.8 5.2l-3.6 3.6" : "M5.9 5v4M8.1 5v4"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  const { index, fraction } = progress(column, columns);
  return (
    <svg viewBox="0 0 14 14" className={cls} aria-hidden>
      <circle
        cx="7"
        cy="7"
        r="5.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={index === 0 ? "2 1.6" : undefined}
      />
      {fraction > 0 ? <path d={pie(fraction)} fill="currentColor" /> : null}
    </svg>
  );
}

/** The mark inside the badge tile: the glyph's shapes, drawn small in the surface colour. */
function BadgeMark({ column, columns }: { column: KanbanColumn; columns: KanbanColumn[] }) {
  const stroke = { stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, fill: "none" };
  if (column.kind === "done") {
    return (
      <svg viewBox="0 0 14 14" className="size-2.5" aria-hidden>
        <path d="M3.6 7.3l2.2 2.2 4.6-4.9" strokeLinejoin="round" {...stroke} strokeWidth={1.9} />
      </svg>
    );
  }
  if (column.kind === "exception") {
    return (
      <svg viewBox="0 0 14 14" className="size-2.5" aria-hidden>
        <path
          d={column.glyph === "cross" ? "M4.2 4.2l5.6 5.6M9.8 4.2l-5.6 5.6" : "M5.2 3.8v6.4M8.8 3.8v6.4"}
          {...stroke}
          strokeWidth={1.9}
        />
      </svg>
    );
  }
  const { index, fraction } = progress(column, columns);
  return (
    <svg viewBox="0 0 14 14" className="size-2.5" aria-hidden>
      <circle cx="7" cy="7" r="5.4" {...stroke} strokeWidth={1.7} strokeDasharray={index === 0 ? "2.4 1.85" : undefined} />
      {fraction > 0 ? <path d={pie(fraction, 3)} fill="currentColor" /> : null}
    </svg>
  );
}
