import * as React from 'react';
import { Icon } from './Icon';
import { UnstyledLink } from './PolarisProvider';
import { cx } from './utils';

export interface PaginationProps {
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  /** Navigate with links instead of callbacks (works from Server Components). */
  previousURL?: string;
  nextURL?: string;
  /** e.g. "1–50 of 1,284". */
  label?: React.ReactNode;
  className?: string;
}

/** Previous / next controls for paged lists. */
export function Pagination({ hasPrevious, hasNext, onPrevious, onNext, previousURL, nextURL, label, className }: PaginationProps) {
  return (
    <nav className={cx('p-pagination', className)} aria-label="Pagination">
      {hasPrevious && previousURL ? (
        <UnstyledLink url={previousURL} className="p-pagination__btn" aria-label="Previous" onClick={onPrevious}>
          <Icon source="ChevronLeftMinor" />
        </UnstyledLink>
      ) : (
        <button type="button" className="p-pagination__btn" disabled={!hasPrevious} onClick={onPrevious} aria-label="Previous">
          <Icon source="ChevronLeftMinor" />
        </button>
      )}
      {label ? <span className="p-pagination__label">{label}</span> : null}
      {hasNext && nextURL ? (
        <UnstyledLink url={nextURL} className="p-pagination__btn" aria-label="Next" onClick={onNext}>
          <Icon source="ChevronRightMinor" />
        </UnstyledLink>
      ) : (
        <button type="button" className="p-pagination__btn" disabled={!hasNext} onClick={onNext} aria-label="Next">
          <Icon source="ChevronRightMinor" />
        </button>
      )}
    </nav>
  );
}
