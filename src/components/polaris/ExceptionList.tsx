import * as React from 'react';
import { Icon } from './Icon';
import type { IconSource } from './types';
import { cx } from './utils';

export interface ExceptionListItem {
  status?: 'warning' | 'critical';
  icon?: IconSource;
  title?: string;
  description?: React.ReactNode;
}

export interface ExceptionListProps {
  items: ExceptionListItem[];
  className?: string;
}

/** Compact list of exceptions on an object (e.g. "Fraud risk: High"). */
export function ExceptionList({ items, className }: ExceptionListProps) {
  return (
    <ul className={cx('p-exceptions', className)}>
      {(items || []).map((it, i) => (
        <li key={i} className={cx('p-exceptions__item', it.status && `p-exceptions__item--${it.status}`)}>
          <span className="p-exceptions__icon">{it.icon ? <Icon source={it.icon} /> : <span className="p-exceptions__dot" />}</span>
          <span>
            {it.title ? <span className="p-exceptions__title">{`${it.title} `}</span> : null}
            {it.description}
          </span>
        </li>
      ))}
    </ul>
  );
}
