'use client';

import * as React from 'react';
import { Button } from './Button';
import { Combobox } from './Combobox';
import { Popover } from './Popover';
import { Select } from './Select';
import { useTableMenuShortcut } from './TableFilterMenu';
import type { TableSortRule } from './tableRules';
import { cx } from './utils';

export interface TableSortMenuProps {
  /** The columns the rows can sort by. */
  fields: { id: string; label: string }[];
  /** First rule first; each later one breaks the ties of those before it. */
  sorting: TableSortRule[];
  onChange: (sorting: TableSortRule[]) => void;
  /** Ctrl/⌘ + Shift + S opens and closes it (default on). */
  shortcut?: boolean;
  preferredAlignment?: 'left' | 'right';
}

const DIRECTIONS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

/**
 * A Sort button with the number of sort rules, opening the list of them: sort
 * by Make, then by Mileage descending. Each rule picks a column (one not
 * already used) and a direction; Add sort takes the next free column, Reset
 * sorting clears them. Ctrl/⌘ + Shift + S opens it. After tablecn's sort menu.
 * @import import { TableSortMenu } from "@/components/genaro";
 */
export function TableSortMenu({ fields, sorting, onChange, shortcut = true, preferredAlignment }: TableSortMenuProps) {
  const [open, setOpen] = React.useState(false);
  const titleId = React.useId();
  const baseId = React.useId();
  /** A sort just added, whose column picker takes focus once it renders. */
  const focusField = React.useRef<string | null>(null);
  useTableMenuShortcut('s', shortcut, () => setOpen((o) => !o));

  React.useEffect(() => {
    if (!focusField.current) return;
    document.getElementById(`${baseId}-${focusField.current}`)?.focus();
    focusField.current = null;
  });

  const used = new Set(sorting.map((s) => s.field));
  const free = fields.filter((f) => !used.has(f.id));
  const labelOf = (id: string) => fields.find((f) => f.id === id)?.label ?? id;

  function add() {
    const next = free[0];
    if (!next) return;
    onChange([...sorting, { field: next.id, desc: false }]);
    focusField.current = next.id;
  }

  const count = sorting.length;
  return (
    <span
      onKeyDown={(e) => {
        if ((e.key === 'Backspace' || e.key === 'Delete') && !open && count > 0 && (e.target as HTMLElement).tagName === 'BUTTON') {
          e.preventDefault();
          onChange(sorting.slice(0, -1));
        }
      }}
    >
      <Popover
        active={open}
        onClose={() => setOpen(false)}
        preferredAlignment={preferredAlignment}
        activator={
          <Button variant="tertiary" icon="SortMinor" pressed={count > 0} ariaExpanded={open} onClick={() => setOpen((o) => !o)} title="Sort (Ctrl+Shift+S)">
            Sort
            {count > 0 ? <span className="p-tablemenu__count">{count}</span> : null}
          </Button>
        }
      >
        <div className={cx('p-tablemenu', 'p-tablemenu--sort', count === 0 && 'p-tablemenu--empty')} role="group" aria-labelledby={titleId}>
          <div className="p-tablemenu__head">
            <h2 id={titleId} className="p-tablemenu__title">
              {count ? 'Sort by' : 'No sorting applied'}
            </h2>
            {count ? null : <p className="p-tablemenu__hint">Add sorting to put the rows in order.</p>}
          </div>
          {count > 0 ? (
            <ul className="p-tablemenu__rows">
              {sorting.map((s, i) => (
                <li key={s.field} className="p-tablemenu__row">
                  <div className="p-tablemenu__field">
                    <Combobox
                      id={`${baseId}-${s.field}`}
                      label={i === 0 ? 'Sort by' : 'Then by'}
                      labelHidden
                      placeholder="Search columns"
                      // This rule's own column, then the ones no rule uses yet.
                      options={fields.filter((f) => f.id === s.field || !used.has(f.id)).map((f) => ({ value: f.id, label: f.label }))}
                      value={s.field}
                      onChange={(field) => {
                        if (field && field !== s.field) onChange(sorting.map((x, j) => (j === i ? { ...x, field } : x)));
                      }}
                      emptyState="No column by that name."
                    />
                  </div>
                  <div className="p-tablemenu__op">
                    <Select
                      label={`${labelOf(s.field)} direction`}
                      labelHidden
                      options={DIRECTIONS}
                      value={s.desc ? 'desc' : 'asc'}
                      onChange={(dir) => onChange(sorting.map((x, j) => (j === i ? { ...x, desc: dir === 'desc' } : x)))}
                    />
                  </div>
                  <span className="p-tablemenu__remove">
                    <Button
                      variant="tertiary"
                      icon="DeleteMinor"
                      accessibilityLabel={`Remove the ${labelOf(s.field)} sort`}
                      onClick={() => onChange(sorting.filter((_, j) => j !== i))}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="p-tablemenu__foot">
            <Button icon="PlusMinor" onClick={add} disabled={free.length === 0}>
              Add sort
            </Button>
            {count > 0 ? (
              <Button variant="tertiary" onClick={() => onChange([])}>
                Reset sorting
              </Button>
            ) : null}
          </div>
        </div>
      </Popover>
    </span>
  );
}
