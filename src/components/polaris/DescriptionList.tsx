import * as React from 'react';
import { cx } from './utils';

export interface DescriptionListProps {
  items: Array<{ term: React.ReactNode; description: React.ReactNode }>;
  gap?: 'tight' | 'loose';
  className?: string;
}

/** Term / description pairs (e.g. shipping details). */
export function DescriptionList({ items, gap, className }: DescriptionListProps) {
  return (
    <dl className={cx('p-dlist', gap === 'tight' && 'p-dlist--tight', className)}>
      {(items || []).map((it, i) => (
        <React.Fragment key={i}>
          <dt className="p-dlist__term">{it.term}</dt>
          <dd className="p-dlist__desc">{it.description}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
