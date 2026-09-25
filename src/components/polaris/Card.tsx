import * as React from 'react';
import { cx } from './utils';

export interface CardProps {
  children?: React.ReactNode;
  /** Card heading (heading-sm). */
  title?: React.ReactNode;
  /** Right-aligned header content, e.g. a plain Button. */
  actions?: React.ReactNode;
  /** `subdued` uses bg-surface-secondary. */
  background?: 'default' | 'subdued';
  /** `'0'` removes the 16px padding (tables, media). */
  padding?: '0' | '400';
  roundedAbove?: 'never' | 'always';
  className?: string;
}

/** White surface that groups related content (radius-300, shadow-100, 16px padding). */
export function Card({ children, title, actions, background, padding, roundedAbove, className }: CardProps) {
  return (
    <div
      className={cx('p-card', background === 'subdued' && 'p-card--subdued', padding === '0' && 'p-card--flush', roundedAbove === 'never' && 'p-card--square', className)}
    >
      {title || actions ? (
        <div className="p-card__header">
          {title ? <h2 className="p-card__title">{title}</h2> : null}
          {actions ? <div className="p-card__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
