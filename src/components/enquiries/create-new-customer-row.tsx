"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateNewCustomerRowProps {
  selected: boolean;
  onSelect: () => void;
  query: string;
}

/**
 * The always-pinned "create new customer" row that lives at the bottom of
 * the search results. Picking it sets `selectedCustomer = null` upstream,
 * which means the form layer will run the new-customer path on submit.
 */
export function CreateNewCustomerRow({
  selected,
  onSelect,
  query,
}: CreateNewCustomerRowProps) {
  const trimmed = query.trim();
  // Same full-row selectable layout as CustomerResultRow (radio indicator,
  // icon tile, two text lines), so it stays a token-styled native <button>.
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex w-full items-center gap-3 rounded-(--radius-200) border border-dashed p-3 text-left text-(--text) transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus)",
        selected
          ? "border-(--border-emphasis) bg-(--bg-surface-secondary-selected)"
          : "border-(--border) bg-(--bg-surface) hover:border-(--border-hover) hover:bg-(--bg-surface-hover)",
      )}
    >
      <div
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-(--border-emphasis)" : "border-(--border)",
        )}
      >
        {selected && (
          <span className="size-2.5 rounded-full bg-(--bg-fill-emphasis)" />
        )}
      </div>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--bg-surface-secondary)">
        <Plus aria-hidden className="size-4 text-(--text-secondary)" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">Create new customer</span>
        <p className="truncate text-xs text-(--text-secondary)">
          {trimmed
            ? `No good match for “${trimmed}”. Create a new customer record.`
            : "Create a new customer record."}
        </p>
      </div>
    </button>
  );
}
