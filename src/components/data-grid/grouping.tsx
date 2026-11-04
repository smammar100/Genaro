"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────
// Row grouping
// ────────────────────────────────────────────────────────────────────────────

interface RowGroup<T> {
  key: string;
  label: string;
  rows: T[];
}

/**
 * Group rows by a key for collapsible sections (ClickUp-style).
 *
 *   const { groups, isCollapsed, toggle } = useRowGroups(
 *     rows, (r) => r.status, (k) => STATUS_LABEL[k]);
 *
 * Render each group as `<DataGridGroupHeaderRow>` followed by its
 * `<DataGridRow>`s (skipped when `isCollapsed(group.key)`).
 *
 * Groups start open; pass `{ defaultCollapsed: true }` to start them closed
 * (a group the user opens stays open as the rows change).
 */
export function useRowGroups<T>(
  rows: T[] | undefined,
  groupBy: (row: T) => string,
  labelFor?: (key: string) => string,
  options?: { defaultCollapsed?: boolean },
) {
  const defaultCollapsed = options?.defaultCollapsed ?? false;
  // The keys the user has flipped away from the default.
  const [flipped, setFlipped] = React.useState<Set<string>>(
    () => new Set(),
  );

  const groups = React.useMemo<RowGroup<T>[] | undefined>(() => {
    if (!rows) return undefined;
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const k = groupBy(row);
      const bucket = map.get(k);
      if (bucket) bucket.push(row);
      else map.set(k, [row]);
    }
    return [...map.entries()].map(([key, groupRows]) => ({
      key,
      label: labelFor ? labelFor(key) : key,
      rows: groupRows,
    }));
  }, [rows, groupBy, labelFor]);

  const toggle = React.useCallback((key: string) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isCollapsed = React.useCallback(
    (key: string) => flipped.has(key) !== defaultCollapsed,
    [flipped, defaultCollapsed],
  );

  return { groups, isCollapsed, toggle };
}

/** Collapsible group banner row spanning the whole table width. */
export function DataGridGroupHeaderRow({
  label,
  count,
  collapsed,
  onToggle,
  span,
  level = 0,
}: {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  /** Total column count incl. the selection + trailing columns. */
  span: number;
  /** 1 for a group nested inside another (a month under its year). */
  level?: 0 | 1;
}) {
  const Chevron = collapsed ? ChevronRight : ChevronDown;
  return (
    <tr>
      <td
        colSpan={span}
        className={
          level === 1
            ? "sticky left-0 border-b bg-(--bg-surface) pr-3 pl-8"
            : "sticky left-0 border-b bg-(--bg-surface-secondary) px-3"
        }
      >
        <button
          type="button"
          aria-expanded={!collapsed}
          onClick={onToggle}
          className="flex h-8 w-full items-center gap-1.5 text-left text-body font-semibold"
        >
          <Chevron className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>{label}</span>
          <span className="p-badge p-badge--neutral tabular-nums">
            {count}
          </span>
        </button>
      </td>
    </tr>
  );
}
