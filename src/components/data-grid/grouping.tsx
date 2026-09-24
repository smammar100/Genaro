"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────
// Row grouping
// ────────────────────────────────────────────────────────────────────────────

export interface RowGroup<T> {
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
 */
export function useRowGroups<T>(
  rows: T[] | undefined,
  groupBy: (row: T) => string,
  labelFor?: (key: string) => string,
) {
  const [collapsed, setCollapsed] = React.useState<Set<string>>(
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
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isCollapsed = React.useCallback(
    (key: string) => collapsed.has(key),
    [collapsed],
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
}: {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  /** Total column count incl. the selection + trailing columns. */
  span: number;
}) {
  const Chevron = collapsed ? ChevronRight : ChevronDown;
  return (
    <tr>
      <td
        colSpan={span}
        className="sticky left-0 border-b bg-[#f7f7f7] px-3"
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex h-8 w-full items-center gap-1.5 text-left text-[13px] font-semibold"
        >
          <Chevron className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>{label}</span>
          <span className="rounded-lg bg-[#ebebeb] px-2 py-0.5 text-xs font-medium tabular-nums text-[#303030]">
            {count}
          </span>
        </button>
      </td>
    </tr>
  );
}
