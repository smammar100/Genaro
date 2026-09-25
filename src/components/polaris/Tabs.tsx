'use client';

import * as React from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import type { MenuItem } from './types';
import { cx } from './utils';

export interface TabDescriptor {
  id?: string;
  content: string;
  badge?: string | number;
  /** Shows a chevron on the selected tab (saved-view actions). */
  actions?: boolean | MenuItem[];
}

export interface TabsProps {
  tabs: TabDescriptor[];
  /** Controlled selected index. */
  selected?: number;
  onSelect?: (index: number) => void;
  /** Tabs share the full width equally. */
  fitted?: boolean;
  /** Adds a "+" button for creating a saved view. */
  canCreateNewView?: boolean;
  onCreateNewView?: () => void;
  className?: string;
}

/** Switches between views of the same content (e.g. All · Unfulfilled · Unpaid). */
export function Tabs({ tabs, selected, onSelect, fitted, canCreateNewView, onCreateNewView, className }: TabsProps) {
  const [inner, setInner] = React.useState(selected || 0);
  const cur = selected != null ? selected : inner;
  return (
    <div className={cx('p-tabs', fitted && 'p-tabs--fitted', className)} role="tablist">
      {(tabs || []).map((t, i) => {
        const sel = i === cur;
        return (
          <button
            key={t.id || i}
            type="button"
            role="tab"
            aria-selected={sel}
            className={cx('p-tab', sel && 'p-tab--selected', sel && !!t.actions && 'p-tab--disclosure')}
            onClick={() => {
              setInner(i);
              onSelect?.(i);
            }}
          >
            <span>{t.content}</span>
            {t.badge != null ? <span className="p-tab__badge">{t.badge}</span> : null}
            {sel && t.actions ? <Icon source="ChevronDownMinor" /> : null}
          </button>
        );
      })}
      {canCreateNewView ? <Button variant="tertiary" icon="PlusMinor" accessibilityLabel="Create new view" onClick={onCreateNewView} /> : null}
    </div>
  );
}
