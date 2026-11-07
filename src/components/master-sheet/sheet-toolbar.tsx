"use client";

import { useState, type ReactNode } from "react";
import { Columns3 } from "lucide-react";
import {
  Button,
  Popover,
  TableFilterMenu,
  TextField,
  type TableFilterField,
  type TableFilterRule,
  type TableJoin,
} from "@/components/genaro";

interface SheetToolbarProps {
  /** The filterable columns and the rules on them (TableFilterMenu). */
  filterFields: TableFilterField[];
  rules: TableFilterRule[];
  join: TableJoin;
  onFiltersChange: (rules: TableFilterRule[], join: TableJoin) => void;
  /** How many columns the person hid, shown on the Columns button. */
  hiddenColumns: number;
  /** The column picker, shown in a popover from the Columns button. */
  columnsPanel: ReactNode;
  search: string;
  onSearchChange: (value: string) => void;
  /** Extra controls before the search field. */
  actions?: ReactNode;
}

/**
 * The one toolbar row inside the sheet's card, after tablecn's advanced
 * toolbar (2026-11-07): Filter opens its list of rules and Columns picks the
 * columns, side by side; the search, at the other end, finds a car by reg,
 * stock ID or make. Sorting is in each column header's menu (the Sort button
 * came off at the user's request).
 */
export function SheetToolbar({
  filterFields,
  rules,
  join,
  onFiltersChange,
  hiddenColumns,
  columnsPanel,
  search,
  onSearchChange,
  actions,
}: SheetToolbarProps) {
  const [columnsOpen, setColumnsOpen] = useState(false);
  return (
    // A phone keeps Filter and Columns on the first line and gives the search
    // the whole second line.
    <div className="flex flex-wrap items-center gap-2 p-2">
      <TableFilterMenu fields={filterFields} rules={rules} join={join} onChange={onFiltersChange} />
      <Popover
        active={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        activator={
          <Button
            variant="tertiary"
            icon={<Columns3 className="size-4" />}
            pressed={hiddenColumns > 0}
            ariaExpanded={columnsOpen}
            onClick={() => setColumnsOpen((open) => !open)}
            accessibilityLabel={
              hiddenColumns > 0
                ? `Columns: ${hiddenColumns} hidden`
                : "Columns: choose which show"
            }
          >
            Columns
            {hiddenColumns > 0 ? <span className="p-tablemenu__count">{hiddenColumns}</span> : null}
          </Button>
        }
      >
        {columnsPanel}
      </Popover>
      <span className="flex-1" />
      {actions}
      <div className="order-last w-full sm:order-none sm:w-64">
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
  );
}
