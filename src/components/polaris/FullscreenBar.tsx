import * as React from 'react';
import { Badge, type BadgeProps } from './Badge';
import { Icon } from './Icon';
import { cx } from './utils';

export interface FullscreenBarProps {
  /** Called by the Exit button. */
  onAction?: () => void;
  title?: React.ReactNode;
  badge?: BadgeProps & { content: string };
  /** Actions on the right, e.g. a primary Save button. */
  children?: React.ReactNode;
  className?: string;
}

/** Top bar for full-screen editing experiences, with an Exit button. */
export function FullscreenBar({ onAction, title, badge, children, className }: FullscreenBarProps) {
  let badgeEl: React.ReactNode = null;
  if (badge) {
    const { content, ...rest } = badge;
    badgeEl = <Badge {...rest}>{content}</Badge>;
  }
  return (
    <div className={cx('p-fullscreen-bar', className)}>
      <button type="button" className="p-fullscreen-bar__back" onClick={onAction}>
        <Icon source="ExitMajor" />
        <span>Exit</span>
      </button>
      <div className="p-fullscreen-bar__title">
        {title}
        {badgeEl}
      </div>
      <div className="p-fullscreen-bar__actions">{children}</div>
    </div>
  );
}
