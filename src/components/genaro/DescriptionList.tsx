import * as React from 'react';
import { cx } from './utils';

export interface DescriptionListProps {
  items: Array<{ term: React.ReactNode; description: React.ReactNode }>;
  gap?: 'tight' | 'loose';
  /** A rule between rows. Off by default: spacing separates rows; use it only when the rows can't be read without one. */
  divided?: boolean;
  /** `'end'` right-aligns the descriptions, so values line up down a narrow card's edge. */
  descriptionAlign?: 'start' | 'end';
  className?: string;
}

/**
 * Term / description pairs (e.g. shipping details).
 * @import import { DescriptionList } from "@/components/genaro";
 */
export function DescriptionList({ items, gap, divided, descriptionAlign, className }: DescriptionListProps) {
  return (
    <dl
      className={cx(
        'p-dlist',
        gap === 'tight' && 'p-dlist--tight',
        divided && 'p-dlist--divided',
        descriptionAlign === 'end' && 'p-dlist--align-end',
        className,
      )}
    >
      {(items || []).map((it, i) => (
        <React.Fragment key={i}>
          <dt className="p-dlist__term">{it.term}</dt>
          <dd className="p-dlist__desc">{it.description}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
