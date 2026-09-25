import * as React from 'react';
import { UnstyledLink } from './PolarisProvider';
import { cx } from './utils';

export interface LinkProps {
  children?: React.ReactNode;
  url?: string;
  external?: boolean;
  target?: string;
  /** Inherits the surrounding text color. */
  monochrome?: boolean;
  removeUnderline?: boolean;
  /** Without a `url`, renders a link-styled button that runs onClick. */
  onClick?: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  className?: string;
}

/** Inline text link (text-link). Describe the destination — never "click here". Tip: import as `{ Link as PolarisLink }` next to next/link. */
export function Link({ children, url, external, target, monochrome, removeUnderline, onClick, className }: LinkProps) {
  const cls = cx('p-link', monochrome && 'p-link--mono', removeUnderline && 'p-link--plain', className);
  if (!url && onClick) {
    return (
      <button type="button" className={cls} onClick={onClick}>
        {children}
      </button>
    );
  }
  return (
    <UnstyledLink
      url={url || '#'}
      external={external}
      target={target}
      className={cls}
      onClick={onClick}
    >
      {children}
    </UnstyledLink>
  );
}
