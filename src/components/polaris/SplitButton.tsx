'use client';

import * as React from 'react';
import { ActionList } from './ActionList';
import { Button } from './Button';
import type { MenuItem } from './types';
import { cx } from './utils';

export interface SplitButtonProps {
  children?: React.ReactNode;
  onAction?: () => void;
  /** Menu items behind the chevron. */
  actions?: MenuItem[];
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}

/** A main action with related actions in a menu. */
export function SplitButton({ children, onAction, actions, variant, disabled, className }: SplitButtonProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);
  const v = variant || 'primary';
  return (
    <div ref={ref} className={cx('p-split', className)}>
      <div className="p-split__row">
        <Button variant={v} onClick={onAction} disabled={disabled}>
          {children}
        </Button>
        <Button
          variant={v}
          icon="ChevronDownMinor"
          accessibilityLabel="More actions"
          ariaExpanded={open}
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
        />
      </div>
      {open && actions ? (
        <div className="p-popover__panel p-split__menu">
          <ActionList items={actions} onActionAnyItem={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
