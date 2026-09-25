"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared GitHub-style timeline (Mobbin reference: GitHub contribution
 * activity feed). One continuous vertical rail; each event is a circular
 * tone-coded icon node anchored to the rail with an inline title +
 * right-aligned timestamp. Rich events drop a bordered card body below
 * the title row.
 *
 * Use across:
 *   - vehicle-detail/activity-tab.tsx       (every action_type)
 *   - vehicle-detail/location-tab.tsx       (per location_movement)
 *   - locations/location-history-drawer.tsx (same movement list, sheet)
 */

export type TimelineTone =
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "sky"
  | "slate";

const TONE_STYLES: Record<TimelineTone, { wrap: string; icon: string }> = {
  emerald: {
    wrap: "bg-(--bg-surface-success) text-(--text-success) ring-(--border-success)",
    icon: "",
  },
  amber: {
    wrap: "bg-(--bg-surface-warning) text-(--text-warning) ring-(--border-warning)",
    icon: "",
  },
  rose: {
    wrap: "bg-(--bg-surface-critical) text-(--text-critical) ring-(--border-critical)",
    icon: "",
  },
  violet: {
    wrap: "bg-(--bg-surface-magic) text-(--text-magic) ring-(--border-magic)",
    icon: "",
  },
  sky: {
    wrap: "bg-(--bg-surface-info) text-(--text-info) ring-(--border-info)",
    icon: "",
  },
  slate: {
    wrap: "bg-muted text-muted-foreground ring-border",
    icon: "",
  },
};

/** Diameter of the icon node + half of it as left offset for the rail. */
const NODE_SIZE_CLASS = "size-8";   // 32px
const RAIL_LEFT_PX = 15;            // = (32px - 2px rail) / 2
const CONTENT_PADDING_LEFT = "pl-12"; // 32px node + 16px gap

/** Root list. Renders a single dashed vertical rail behind the children. */
export function Timeline({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ol className={cn("relative space-y-4", className)}>
      <span
        aria-hidden
        className="absolute top-3 bottom-3 border-l-2 border-dashed border-border"
        style={{ left: RAIL_LEFT_PX }}
      />
      {children}
    </ol>
  );
}

interface TimelineItemProps {
  /** Icon shown inside the node. Lucide preferred. */
  icon: LucideIcon;
  /** Visual tone for the node (controls bg / text / ring). */
  tone?: TimelineTone;
  /** Right-aligned secondary text (date, time, "Aug 14", etc.). */
  timestamp?: ReactNode;
  /**
   * Optional rich body shown in a bordered card below the title row.
   * Pass real React content (paragraphs, buttons, etc.) — leave undefined
   * for an inline-only event.
   */
  body?: ReactNode;
  /**
   * Inline title content — text, bold strong tags, links, anything. The
   * actor name typically lives here as a leading <strong>.
   */
  children: ReactNode;
  className?: string;
}

/**
 * One row in a timeline. The title row sits on the rail with the icon
 * node; the optional body card hangs below indented to match.
 */
export function TimelineItem({
  icon: Icon,
  tone = "slate",
  timestamp,
  body,
  children,
  className,
}: TimelineItemProps) {
  const tones = TONE_STYLES[tone];
  return (
    <li className={cn("relative", CONTENT_PADDING_LEFT, className)}>
      <span
        aria-hidden
        className={cn(
          "absolute top-0 inline-flex items-center justify-center rounded-full ring-2 ring-background",
          NODE_SIZE_CLASS,
          tones.wrap,
        )}
        style={{ left: 0 }}
      >
        <Icon className={cn("size-4", tones.icon)} />
      </span>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 pt-1.5">
        <div className="min-w-0 text-sm leading-snug text-foreground">
          {children}
        </div>
        {timestamp ? (
          <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {timestamp}
          </div>
        ) : null}
      </div>

      {body ? (
        <div className="mt-2 rounded-lg border bg-card p-3 text-sm">{body}</div>
      ) : null}
    </li>
  );
}
