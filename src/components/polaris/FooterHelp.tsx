import * as React from 'react';
import { cx } from './utils';

export interface FooterHelpProps {
  /** e.g. "Learn more about <Link>fulfilling orders</Link>". */
  children?: React.ReactNode;
  className?: string;
}

/** Help link at the bottom of a page. */
export function FooterHelp({ children, className }: FooterHelpProps) {
  return (
    <div className={cx('p-footer-help', className)}>
      <span>{children}</span>
    </div>
  );
}
