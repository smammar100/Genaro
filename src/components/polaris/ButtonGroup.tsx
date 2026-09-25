import * as React from 'react';
import { cx } from './utils';

export interface ButtonGroupProps {
  children?: React.ReactNode;
  /** Joins the buttons into one segmented control. */
  variant?: 'segmented';
  fullWidth?: boolean;
  /** 4px instead of 8px between buttons. */
  gap?: 'tight';
  className?: string;
}

/** Lays out related buttons 8px apart (space-button-group-gap). */
export function ButtonGroup({ children, variant, fullWidth, gap, className }: ButtonGroupProps) {
  return (
    <div
      className={cx('p-btn-group', variant === 'segmented' && 'p-btn-group--segmented', fullWidth && 'p-btn-group--full', gap === 'tight' && 'p-btn-group--tight', className)}
      role={variant === 'segmented' ? 'group' : undefined}
    >
      {React.Children.map(children, (child) => (child ? <div className="p-btn-group__item">{child}</div> : null))}
    </div>
  );
}
