"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Columns3, Filter } from "lucide-react";
import {
  Button,
  Popover,
  Select,
  Tag,
  TextField,
} from "@/components/polaris";

type Option = { value: string; label: string };

export interface SheetFilterBuilder {
  fields: Option[];
  field: string;
  onFieldChange: (field: string) => void;
  ops: Option[];
  op: string;
  onOpChange: (op: string) => void;
  value: string;
  onValueChange: (value: string) => void;
  /** Adds the condition (and closes the panel when it was valid). */
  onAdd: () => void;
}

export interface SheetToolbarProps {
  /** "21 of 72 shown". */
  columnsLabel: string;
  /** The column picker, shown in a popover from the columns button. */
  columnsPanel: ReactNode;
  /** Applied conditions, shown as removable tags under the toolbar. */
  filters: { id: number; label: string }[];
  onRemoveFilter: (id: number) => void;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  builder: SheetFilterBuilder;
  search: string;
  onSearchChange: (value: string) => void;
  /** Extra controls before the search field. */
  actions?: ReactNode;
}

/**
 * The one toolbar row inside the sheet's card: columns, filter and search
 * (Airtable-style), with the applied filters as tags beneath it.
 */
export function SheetToolbar({
  columnsLabel,
  columnsPanel,
  filters,
  onRemoveFilter,
  filterOpen,
  onFilterOpenChange,
  builder,
  search,
  onSearchChange,
  actions,
}: SheetToolbarProps) {
  const [columnsOpen, setColumnsOpen] = useState(false);
  const filterLabel =
    filters.length === 0
      ? "Filter"
      : `${filters.length} ${filters.length === 1 ? "filter" : "filters"}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    builder.onAdd();
  }

  return (
    <div className="flex flex-col gap-2 border-b border-(--border-secondary) px-3 py-2">
      <div className="flex flex-wrap items-center gap-1">
        <Popover
          active={columnsOpen}
          onClose={() => setColumnsOpen(false)}
          activator={
            <Button
              variant="tertiary"
              icon={<Columns3 className="size-4" />}
              ariaExpanded={columnsOpen}
              onClick={() => setColumnsOpen((open) => !open)}
            >
              {columnsLabel}
            </Button>
          }
        >
          {columnsPanel}
        </Popover>
        <Popover
          active={filterOpen}
          onClose={() => onFilterOpenChange(false)}
          sectioned
          activator={
            <Button
              variant="tertiary"
              icon={<Filter className="size-4" />}
              pressed={filters.length > 0}
              ariaExpanded={filterOpen}
              onClick={() => onFilterOpenChange(!filterOpen)}
            >
              {filterLabel}
            </Button>
          }
        >
          <form onSubmit={submit} className="flex w-72 flex-col gap-3">
            <p className="heading-sm">Add condition</p>
            <Select
              label="Field"
              options={builder.fields}
              value={builder.field}
              onChange={builder.onFieldChange}
            />
            <Select
              label="Operator"
              options={builder.ops}
              value={builder.op}
              onChange={builder.onOpChange}
            />
            <TextField
              label="Value"
              value={builder.value}
              onChange={(value) => builder.onValueChange(value)}
              autoComplete="off"
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => onFilterOpenChange(false)}>Cancel</Button>
              <Button variant="primary" submit disabled={!builder.value.trim()}>
                Add filter
              </Button>
            </div>
          </form>
        </Popover>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <div className="w-64">
            <TextField
              label="Search"
              labelHidden
              prefix="SearchMinor"
              placeholder="Search reg, stock, make"
              value={search}
              onChange={(value) => onSearchChange(value)}
              clearButton
              onClearButtonClick={() => onSearchChange("")}
            />
          </div>
        </div>
      </div>
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <Tag key={f.id} onRemove={() => onRemoveFilter(f.id)}>
              {f.label}
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
}
