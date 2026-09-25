'use client';

import * as React from 'react';
import { KeyboardKey } from './KeyboardKey';
import { cx } from './utils';

export interface TooltipProps {
  /** The element that shows the tooltip on hover or focus. */
  children?: React.ReactNode;
  content: React.ReactNode;
  preferredPosition?: 'above' | 'below' | 'left' | 'right';
  /** Keyboard shortcut shown after the text, e.g. "⌘S". */
  suffix?: string;
  /** Force it open (controlled). */
  active?: boolean;
  className?: string;
}

/** Short label for an icon button or truncated text (bg-surface-inverse). */
export function Tooltip({ children, content, preferredPosition, suffix, active, className }: TooltipProps) {
  const [hover, setHover] = React.useState(!!active);
  const tipId = React.useId();
  const open = active != null ? active : hover;
  const pos = preferredPosition && ['above', 'below', 'left', 'right'].includes(preferredPosition) ? preferredPosition : 'above';
  return (
    <span
      className={cx('p-tooltip-wrap', className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-describedby={open ? tipId : undefined}
    >
      {children}
      {open ? (
        <span className={cx('p-tooltip', `p-tooltip--${pos}`)} role="tooltip" id={tipId}>
          <span className="p-tooltip__content">
            {content}
            {suffix ? <KeyboardKey>{suffix}</KeyboardKey> : null}
          </span>
        </span>
      ) : null}
    </span>
  );
}
