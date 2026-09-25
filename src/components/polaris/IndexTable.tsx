'use client';

import * as React from 'react';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Filters, type FiltersProps } from './Filters';
import { ActionList } from './ActionList';
import { Icon } from './Icon';
import { Pagination, type PaginationProps } from './Pagination';
import { Popover } from './Popover';
import { UnstyledLink } from './PolarisProvider';
import { Tabs, type TabDescriptor } from './Tabs';
import type { Action, MenuItem } from './types';
import { cx } from './utils';

export type SortDirection = 'ascending' | 'descending';

/** A click inside one of these belongs to that control, not to onRowClick. */
const ROW_CONTROLS = 'a, button, input, select, textarea, label, [role="checkbox"], [role="button"], .p-indextable__check';

export interface IndexTableHeading {
  title: string;
  /** `end` for numbers such as totals. */
  alignment?: 'start' | 'end';
  /** A thumbnail column (40px Thumbnail cells). */
  media?: boolean;
  sortable?: boolean;
}

export interface IndexTableRow {
  id: string;
  cells: React.ReactNode[];
  /** Makes the primary cell a link to the resource (e.g. the order detail page). */
  url?: string;
}

export interface IndexTableProps {
  headings: IndexTableHeading[];
  rows: IndexTableRow[];
  /** Row checkboxes (default true). */
  selectable?: boolean;
  /** The semibold name column; defaults to the first non-media column. */
  primaryColumn?: number;
  /** 32px rows. */
  condensed?: boolean;
  sortColumnIndex?: number;
  sortDirection?: SortDirection;
  onSort?: (index: number, direction: SortDirection) => void;
  /** Filters shown when the search button is pressed. */
  filters?: FiltersProps;
  filtersOpen?: boolean;
  /** Buttons in the floating bulk-actions bar while rows are selected. */
  promotedBulkActions?: Action[];
  /** Adds a ••• button to the bulk-actions bar; pass menu items to open them in a menu. */
  bulkActions?: boolean | MenuItem[];
  canCreateNewView?: boolean;
  onCreateNewView?: () => void;
  /** Called by the sort button beside the search button. */
  onSortButtonClick?: () => void;
  /** Controlled when you also pass onSelectionChange. */
  selectedItems?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /**
   * Whole-row click (Client Components only). Clicks on the row's own controls
   * — links, buttons, checkboxes, fields — are left to them. Keep a link or
   * button in the row (e.g. `url`) so keyboard users can open it too.
   */
  onRowClick?: (id: string) => void;
  /** Saved views above the table. */
  tabs?: TabDescriptor[];
  selectedTab?: number;
  onSelectTab?: (index: number) => void;
  pagination?: PaginationProps;
  className?: string;
}

/** The main list view for orders, products and customers: views, search/filter, sortable headings, selectable rows, bulk actions. */
export function IndexTable(props: IndexTableProps) {
  const {
    selectable, condensed, filters, promotedBulkActions, bulkActions, canCreateNewView, onCreateNewView, onSortButtonClick, tabs, selectedTab, onSelectTab,
    pagination, className,
  } = props;
  const [bulkMenu, setBulkMenu] = React.useState(false);
  const [inner, setInner] = React.useState<string[]>(props.selectedItems || []);
  const sel = props.selectedItems && props.onSelectionChange ? props.selectedItems : inner;
  const rows = props.rows || [];
  const heads = props.headings || [];
  const [sort, setSort] = React.useState<{ index?: number; dir: SortDirection }>({ index: props.sortColumnIndex, dir: props.sortDirection || 'descending' });
  const [searching, setSearching] = React.useState(!!props.filtersOpen);
  const all = rows.length > 0 && sel.length === rows.length;
  const primary = props.primaryColumn != null ? props.primaryColumn : heads[0] && heads[0].media ? 1 : 0;
  const bulk = promotedBulkActions || [];
  const showBulk = sel.length > 0 && (bulk.length > 0 || !!bulkActions);

  function setSel(next: string[]) {
    setInner(next);
    props.onSelectionChange?.(next);
  }
  function sortBy(i: number) {
    const dir: SortDirection = sort.index === i && sort.dir === 'descending' ? 'ascending' : 'descending';
    setSort({ index: i, dir });
    props.onSort?.(i, dir);
  }

  return (
    <div className={cx('p-card p-card--flush p-indextable', condensed && 'p-indextable--condensed', showBulk && 'p-indextable--bulk', className)}>
      {tabs || filters ? (
        searching && filters ? (
          <div className="p-indextable__searchbar">
            <div style={{ flex: 1 }}>
              <Filters {...filters} />
            </div>
            <Button variant="tertiary" onClick={() => setSearching(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="p-indextable__filters">
            {tabs ? (
              <Tabs tabs={tabs} selected={selectedTab} onSelect={onSelectTab} canCreateNewView={canCreateNewView} onCreateNewView={onCreateNewView} />
            ) : (
              <span />
            )}
            <div className="p-indextable__controls">
              <button type="button" className="p-indextable__searchbtn" aria-label="Search and filter" onClick={() => setSearching(true)}>
                <Icon source="SearchMinor" />
                <Icon source="FilterMinor" />
              </button>
              <Button icon="SortMinor" accessibilityLabel="Sort" onClick={onSortButtonClick} />
            </div>
          </div>
        )
      ) : null}
      <div className="p-indextable__scroll">
        <table>
          <thead>
            <tr>
              {selectable !== false ? (
                <th className="p-indextable__check">
                  <Checkbox
                    label="Select all"
                    labelHidden
                    checked={all ? true : sel.length ? 'indeterminate' : false}
                    onChange={() => setSel(all ? [] : rows.map((r) => r.id))}
                  />
                </th>
              ) : null}
              {sel.length ? (
                <th colSpan={heads.length}>
                  <span className="p-indextable__count">{`${sel.length} selected`}</span>
                </th>
              ) : (
                heads.map((c, i) => {
                  const active = sort.index === i;
                  const label = c.media ? <span className="p-visually-hidden">{c.title || 'Image'}</span> : c.title;
                  return (
                    <th key={i} className={cx(c.alignment === 'end' && 'p-num', c.media && 'p-indextable__media')}>
                      {c.sortable ? (
                        <button type="button" className={cx('p-indextable__sort', active && 'p-indextable__sort--active')} onClick={() => sortBy(i)}>
                          {label}
                          <Icon source={active && sort.dir === 'ascending' ? 'SortAscendingMajor' : 'SortDescendingMajor'} />
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  );
                })
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const on = sel.includes(r.id);
              return (
                <tr
                  key={r.id}
                  className={cx(on && 'p-indextable__row--selected', props.onRowClick && 'p-indextable__row--clickable')}
                  onClick={
                    props.onRowClick
                      ? (e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest(ROW_CONTROLS) && e.currentTarget.contains(target.closest(ROW_CONTROLS))) return;
                          props.onRowClick?.(r.id);
                        }
                      : undefined
                  }
                >
                  {selectable !== false ? (
                    <td className="p-indextable__check">
                      <Checkbox
                        label={`Select ${typeof r.cells[primary] === 'string' ? r.cells[primary] : 'row'}`}
                        labelHidden
                        checked={on}
                        onChange={(v) => setSel(v ? sel.concat([r.id]) : sel.filter((x) => x !== r.id))}
                      />
                    </td>
                  ) : null}
                  {r.cells.map((c, i) => {
                    const hd = heads[i] || ({} as IndexTableHeading);
                    return (
                      <td key={i} className={cx(hd.alignment === 'end' && 'p-num', hd.media && 'p-indextable__media', i === primary && 'p-indextable__primary')}>
                        {i === primary && r.url ? (
                          <UnstyledLink url={r.url} className="p-indextable__link">
                            {c}
                          </UnstyledLink>
                        ) : (
                          c
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pagination ? (
        <div className="p-indextable__footer">
          <Pagination {...pagination} />
        </div>
      ) : null}
      {showBulk ? (
        <div className="p-bulkactions">
          {bulk.map((a, i) => (
            <button key={i} type="button" className="p-bulkactions__btn" onClick={a.onAction}>
              {a.content}
            </button>
          ))}
          {Array.isArray(bulkActions) ? (
            <Popover
              active={bulkMenu}
              onClose={() => setBulkMenu(false)}
              preferredAlignment="right"
              preferredPosition="above"
              activator={
                <button
                  type="button"
                  className="p-bulkactions__btn p-bulkactions__btn--icon"
                  aria-label="More actions"
                  aria-expanded={bulkMenu}
                  onClick={() => setBulkMenu((o) => !o)}
                >
                  <Icon source="HorizontalDotsMinor" />
                </button>
              }
            >
              <ActionList items={bulkActions} onActionAnyItem={() => setBulkMenu(false)} />
            </Popover>
          ) : bulkActions ? (
            <button type="button" className="p-bulkactions__btn p-bulkactions__btn--icon" aria-label="More actions">
              <Icon source="HorizontalDotsMinor" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
