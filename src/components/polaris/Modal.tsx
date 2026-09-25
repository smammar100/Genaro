'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { ButtonGroup } from './ButtonGroup';
import { usePortalTarget } from './internal/usePortal';
import type { Action } from './types';
import { cx } from './utils';

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children?: React.ReactNode;
  primaryAction?: Action & { destructive?: boolean; loading?: boolean; disabled?: boolean };
  secondaryActions?: Action[];
  size?: 'small' | 'large';
  /** Render in place without the backdrop (for docs and previews). */
  inline?: boolean;
  className?: string;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Dialog for focused tasks and confirmations (radius-500, shadow-600). Portals to <body>, moves focus into the
 * dialog and keeps it there (Tab cycles), locks page scroll, closes on Escape and backdrop click, and returns
 * focus to the previously focused element when it closes.
 */
export function Modal({ open, onClose, title, children, primaryAction, secondaryActions, size, inline, className }: ModalProps) {
  const target = usePortalTarget();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  const mounted = open && !inline && !!target;

  React.useEffect(() => {
    if (!mounted) return;
    const node = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [mounted]);

  if (!open) return null;
  const body = (
    <div ref={dialogRef} tabIndex={inline ? undefined : -1} className={cx('p-modal', size && `p-modal--${size}`, className)} role="dialog" aria-modal aria-label={title}>
      {title ? (
        <div className="p-modal__header">
          <h2 className="p-modal__title">{title}</h2>
          <Button variant="tertiary" icon="CancelMajor" accessibilityLabel="Close" onClick={onClose} />
        </div>
      ) : null}
      <div className="p-modal__body">{children}</div>
      {primaryAction || secondaryActions ? (
        <div className="p-modal__footer">
          <ButtonGroup>
            {(secondaryActions || []).map((a, i) => (
              <Button key={i} onClick={a.onAction} url={a.url} external={a.external} testId={a.testId} id={a.id}>
                {a.content}
              </Button>
            ))}
            {primaryAction ? (
              <Button
                variant="primary"
                tone={primaryAction.destructive ? 'critical' : undefined}
                onClick={primaryAction.onAction}
                url={primaryAction.url}
                external={primaryAction.external}
                loading={primaryAction.loading}
                disabled={primaryAction.disabled}
                testId={primaryAction.testId}
                id={primaryAction.id}
              >
                {primaryAction.content}
              </Button>
            ) : null}
          </ButtonGroup>
        </div>
      ) : null}
    </div>
  );
  if (inline) return body;
  if (!target) return null;
  return createPortal(
    <div
      className="p-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {body}
    </div>,
    target,
  );
}
