"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

/**
 * Pagination controls. Shows row range ("Showing 26-50 of 114"), a rows-
 * per-page select, and prev/next buttons.
 *
 * Designed to sit at the bottom of a table card. Consumer passes the same
 * values the `usePagination` hook returns.
 */
export function DataGridPagination({
  page,
  pageSize,
  totalPages,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  onPageChange: (next: number) => void;
  onPageSizeChange?: (next: number) => void;
}) {
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-(--bg-surface-secondary) px-3 py-2 text-[13px]">
      <div className="flex items-center gap-3 text-(--text-secondary)">
        <span className="tabular-nums">
          {total === 0
            ? "No rows"
            : `Showing ${firstRow}-${lastRow} of ${total}`}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger size="sm" className="h-7 min-h-7 w-[72px] min-w-0 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="tabular-nums text-(--text-secondary)">
          Page <span className="font-medium text-foreground">{page}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </span>
        {/* Shopify index-table pager: a joined pair of small arrow buttons. */}
        <div className="flex items-center overflow-hidden rounded-(--radius-200) border border-(--border) bg-(--bg-surface)">
          <button
            type="button"
            aria-label="Previous"
            title="Previous"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex h-7 w-8 items-center justify-center text-(--icon) transition-colors hover:bg-(--bg-fill-transparent-hover) hover:text-(--icon-hover) disabled:pointer-events-none disabled:text-(--icon-disabled)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span aria-hidden className="h-7 w-px bg-(--border)" />
          <button
            type="button"
            aria-label="Next"
            title="Next"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex h-7 w-8 items-center justify-center text-(--icon) transition-colors hover:bg-(--bg-fill-transparent-hover) hover:text-(--icon-hover) disabled:pointer-events-none disabled:text-(--icon-disabled)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
