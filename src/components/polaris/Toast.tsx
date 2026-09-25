'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { usePortalTarget } from './internal/usePortal';
import { UnstyledLink } from './PolarisProvider';
import type { Action } from './types';
import { cx } from './utils';

export interface ToastProps {
  /** Short confirmation: "Product saved". */
  content: string;
  onDismiss?: () => void;
  error?: boolean;
  action?: Action;
  /** Auto-dismiss after this many ms (calls onDismiss). Off by default. */
  duration?: number;
  /** Float at the bottom centre of the viewport (portal to <body>). Use this in apps; leave off to render in place. */
  floating?: boolean;
  className?: string;
}

/** Brief, non-disruptive confirmation on dark chrome (bg-inverse). */
export function Toast({ content, onDismiss, error, action, duration, floating, className }: ToastProps) {
  const target = usePortalTarget();
  const dismissRef = React.useRef(onDismiss);
  dismissRef.current = onDismiss;
  React.useEffect(() => {
    if (!duration) return;
    const t = window.setTimeout(() => dismissRef.current?.(), duration);
    return () => window.clearTimeout(t);
  }, [duration]);

  const toast = (
    <div className={cx('p-toast', error && 'p-toast--error', className)} role="status">
      <span className="p-toast__msg">{content}</span>
      {action && action.url ? (
        <UnstyledLink url={action.url} external={action.external} className="p-toast__action" onClick={action.onAction}>
          {action.content}
        </UnstyledLink>
      ) : action ? (
        <button type="button" className="p-toast__action" onClick={action.onAction}>
          {action.content}
        </button>
      ) : null}
      <button type="button" className="p-toast__close" aria-label="Dismiss notification" onClick={onDismiss}>
        <Icon source="CancelSmallMinor" />
      </button>
    </div>
  );
  if (!floating) return toast;
  if (!target) return null;
  return createPortal(<div className="p-toast-layer">{toast}</div>, target);
}
