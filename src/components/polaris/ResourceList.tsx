'use client';

import * as React from 'react';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { UnstyledLink } from './PolarisProvider';
import { Select, type SelectOption } from './Select';
import type { Action } from './types';
import { cx } from './utils';

export interface ResourceListItem {
  id: string;
  name: string;
  /** Links the name to the resource (keyboard-reachable; reveals shortcut actions on focus). */
  url?: string;
  meta?: React.ReactNode;
  /** Usually an Avatar or Thumbnail. */
  media?: React.ReactNode;
  badge?: React.ReactNode;
  shortcutActions?: Action[];
}

export interface ResourceListProps {
  items: ResourceListItem[];
  selectable?: boolean;
  /** Controlled when you also pass onSelectionChange. */
  selectedItems?: string[];
  onSelectionChange?: (ids: string[]) => void;
  resourceName?: { singular: string; plural: string };
  totalItemsCount?: number;
  /** Usually <Filters />. */
  filterControl?: React.ReactNode;
  sortOptions?: Array<string | SelectOption>;
  sortValue?: string;
  onSortChange?: (value: string) => void;
  promotedBulkActions?: Action[];
  className?: string;
}

/** A card list of customers, locations or other resources, with selection and sort. */
export function ResourceList({
  items: itemsProp, selectable, selectedItems, onSelectionChange, resourceName, totalItemsCount, filterControl, sortOptions, sortValue, onSortChange, promotedBulkActions, className,
}: ResourceListProps) {
  const [inner, setInner] = React.useState<string[]>(selectedItems || []);
  const sel = selectedItems && onSelectionChange ? selectedItems : inner;
  const items = itemsProp || [];
  const rn = resourceName || { singular: 'item', plural: 'items' };
  function setSel(next: string[]) {
    setInner(next);
    onSelectionChange?.(next);
  }
  const all = items.length > 0 && sel.length === items.length;
  const total = totalItemsCount != null ? totalItemsCount : items.length;
  return (
    <div className={cx('p-card p-card--flush p-reslist', className)}>
      {filterControl ? <div className="p-reslist__filters">{filterControl}</div> : null}
      <div className="p-reslist__header">
        {selectable ? (
          <Checkbox
            label={sel.length ? `${sel.length} selected` : 'Select all'}
            labelHidden={!sel.length}
            checked={all ? true : sel.length ? 'indeterminate' : false}
            onChange={() => setSel(all ? [] : items.map((i) => i.id))}
          />
        ) : null}
        {!sel.length ? (
          <span className="p-reslist__count">{`Showing ${items.length}${total > items.length ? ` of ${total}` : ''} ${total === 1 ? rn.singular : rn.plural}`}</span>
        ) : null}
        {sel.length && promotedBulkActions ? (
          <div className="p-reslist__bulk">
            {promotedBulkActions.map((a, i) => (
              <Button key={i} size="micro" onClick={a.onAction}>
                {a.content}
              </Button>
            ))}
          </div>
        ) : null}
        {sortOptions && !sel.length ? (
          <div className="p-reslist__sort">
            <Select label="Sort by" labelInline options={sortOptions} value={sortValue} onChange={onSortChange} />
          </div>
        ) : null}
      </div>
      <ul className="p-reslist__items">
        {items.map((it) => {
          const on = sel.includes(it.id);
          return (
            <li key={it.id} className={cx('p-resitem', on && 'p-resitem--selected')}>
              {selectable ? (
                <Checkbox
                  label={`Select ${it.name}`}
                  labelHidden
                  checked={on}
                  onChange={(v) => setSel(v ? sel.concat([it.id]) : sel.filter((x) => x !== it.id))}
                />
              ) : null}
              {it.media || null}
              <div className="p-resitem__content">
                <div className="p-resitem__name">
                  {it.url ? (
                    <UnstyledLink url={it.url} className="p-resitem__link">
                      {it.name}
                    </UnstyledLink>
                  ) : (
                    it.name
                  )}
                </div>
                {it.meta ? <div>{it.meta}</div> : null}
              </div>
              {it.badge || null}
              {it.shortcutActions ? (
                <div className="p-resitem__shortcuts">
                  {it.shortcutActions.map((a, i) => (
                    <Button key={i} size="micro" variant="tertiary" onClick={a.onAction} url={a.url}>
                      {a.content}
                    </Button>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface ResourceItemProps {
  media?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/** A standalone resource row (media + content) for custom lists. */
export function ResourceItem({ media, children, className }: ResourceItemProps) {
  return (
    <div className={cx('p-resitem', className)}>
      {media || null}
      <div className="p-resitem__content">{children}</div>
    </div>
  );
}
