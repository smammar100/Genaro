"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button, Select } from "@/components/genaro";

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const count = (n: number) => n.toLocaleString("en-GB");

/**
 * The pager at the foot of a table card, after tablecn's (2026-11-07). Which
 * rows show (and how many are ticked) on the left; rows per page, page X of Y
 * and the arrows on the right. First and last page join the arrows from a
 * tablet up; a single page shows no arrows at all. On a phone the range and
 * the arrows share the first line, rows per page and the page count the
 * second. The consumer owns the page and page-size state.
 */
export function DataGridPagination({
  page,
  pageSize,
  pageSizes = PAGE_SIZE_OPTIONS,
  totalPages,
  total,
  selected = 0,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  /** The rows-per-page choices. */
  pageSizes?: number[];
  totalPages: number;
  total: number;
  /** Rows ticked, shown beside the range when any are. */
  selected?: number;
  onPageChange: (next: number) => void;
  /** Shows the rows-per-page list. */
  onPageSizeChange?: (next: number) => void;
}) {
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(total, page * pageSize);
  const first = page <= 1;
  const last = page >= totalPages;
  const icon = "size-4";
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-3 py-2">
      <p className="body-md tabular-nums text-(--text-secondary)">
        {total === 0 ? (
          "No rows"
        ) : (
          <>
            <span className="max-sm:hidden">Showing </span>
            {count(firstRow)}–{count(lastRow)} of {count(total)}
            {selected > 0 ? ` · ${count(selected)} selected` : ""}
          </>
        )}
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-1 sm:order-last">
          <span className="max-sm:hidden">
            <Button variant="tertiary" icon={<ChevronsLeft className={icon} />} accessibilityLabel="First page" title="First page" disabled={first} onClick={() => onPageChange(1)} />
          </span>
          <Button variant="tertiary" icon={<ChevronLeft className={icon} />} accessibilityLabel="Previous page" title="Previous page" disabled={first} onClick={() => onPageChange(page - 1)} />
          <Button variant="tertiary" icon={<ChevronRight className={icon} />} accessibilityLabel="Next page" title="Next page" disabled={last} onClick={() => onPageChange(page + 1)} />
          <span className="max-sm:hidden">
            <Button variant="tertiary" icon={<ChevronsRight className={icon} />} accessibilityLabel="Last page" title="Last page" disabled={last} onClick={() => onPageChange(totalPages)} />
          </span>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-6 max-sm:w-full sm:ml-auto">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="body-md text-(--text-secondary)">Rows per page</span>
            <div className="w-20">
              <Select
                label="Rows per page"
                labelHidden
                options={pageSizes.map((size) => ({ value: String(size), label: String(size) }))}
                value={String(pageSize)}
                onChange={(v) => onPageSizeChange(Number(v))}
              />
            </div>
          </div>
        )}
        <span className="body-md tabular-nums text-(--text-secondary)">
          Page <span className="text-(--text)">{count(page)}</span> of{" "}
          <span className="text-(--text)">{count(totalPages)}</span>
        </span>
      </div>
    </div>
  );
}
