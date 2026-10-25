'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Button, type ButtonAction } from './Button';
import { ButtonGroup } from './ButtonGroup';
import { useDialogLayer } from './internal/useDialogLayer';
import { usePortalTarget } from './internal/usePortal';
import { cx } from './utils';

/** A footer action: an Action with button states. `destructive` makes it critical and moves it to the footer's start. */
export type SheetAction = ButtonAction & { destructive?: boolean };

/** A header action beside the close button. Leave out `content` for an icon-only button, and give it an `accessibilityLabel`. */
export type SheetHeaderAction = Omit<ButtonAction, 'content'> & { content?: string };

export interface SheetProps {
  /** Shows the sheet. It slides in from the right, and out again when this turns false. */
  open: boolean;
  /** Called on Escape, on a click on the backdrop and on the close button: set `open` to false here. */
  onClose: () => void;
  /** The heading and the sheet's accessible name: the record or the task ("Location history", a customer's name). Can hold a reg plate or a link. */
  title: React.ReactNode;
  /** One line under the title saying which record this is ("L-927 · Ford Fiesta"). Also the sheet's accessible description. */
  subtitle?: React.ReactNode;
  /** Badges after the title, such as a deal's stage or a warranty's status. */
  titleMetadata?: React.ReactNode;
  /** Tertiary buttons before the close button, such as "Open vehicle". Keep to one or two. */
  headerActions?: SheetHeaderAction[];
  /** The sheet's one main action, at the end of the footer. Critical when `destructive`. */
  primaryAction?: SheetAction;
  /** Other footer buttons, placed before the primary action. Destructive ones are critical and move to the footer's start. */
  secondaryActions?: SheetAction[];
  /** A footer of your own instead of `primaryAction` and `secondaryActions`, such as buttons wrapped in Tooltips that say why they're disabled. */
  footer?: React.ReactNode;
  /** Width: `small` 380px, 480px when unset, `large` 672px. Never wider than the window less 48px. */
  size?: 'small' | 'large';
  /** `subdued` sets the body on bg-surface-secondary, for a stack of Cards. */
  background?: 'default' | 'subdued';
  /** `'0'` removes the body's 16px padding, for full-bleed lists. */
  padding?: '0' | '400';
  /** The body. It scrolls between the fixed header and footer, and its children stack 16px apart. */
  children?: React.ReactNode;
  /** Extra classes on the panel. */
  className?: string;
}

/**
 * A panel that slides in from the right over a backdrop, for a record's details or a longer form
 * beside the page (radius-500, shadow-600). Portals to <body>, moves focus into the panel and keeps it
 * there, locks page scroll, closes on Escape and backdrop click, and returns focus to the element that
 * opened it. A confirmation Modal opened from the sheet stacks above it.
 * @import import { Sheet } from "@/components/genaro";
 */
export function Sheet({
  open, onClose, title, subtitle, titleMetadata, headerActions, primaryAction, secondaryActions, footer,
  size, background, padding, children, className,
}: SheetProps) {
  const target = usePortalTarget();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const subtitleId = React.useId();
  // Mounted from the first open until the slide-out after the last close has finished.
  const [mounted, setMounted] = React.useState(open);
  if (open && !mounted) setMounted(true);
  const shown = mounted && !!target;

  useDialogLayer(open && shown, panelRef, onClose);

  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!shown || !root) return;
    if (open) {
      // Commit the closed position first, so the sheet slides in rather than appears.
      root.getBoundingClientRect();
      root.setAttribute('data-open', '');
      return;
    }
    root.removeAttribute('data-open');
    const running = typeof root.getAnimations === 'function' ? root.getAnimations({ subtree: true }) : [];
    let current = true;
    Promise.all(running.map((animation) => animation.finished)).then(
      () => {
        if (current) setMounted(false);
      },
      // Reopened mid-slide: the transition reverses, and the sheet stays.
      () => {},
    );
    return () => {
      current = false;
    };
  }, [open, shown]);

  if (!shown || !target) return null;

  const destructive = (secondaryActions || []).filter((a) => a.destructive);
  const others = (secondaryActions || []).filter((a) => !a.destructive);
  const actionButton = (action: SheetAction, key: number, variant?: 'primary') => (
    <Button
      key={key}
      variant={variant}
      tone={action.destructive ? 'critical' : undefined}
      icon={action.icon}
      onClick={action.onAction}
      url={action.url}
      external={action.external}
      loading={action.loading}
      disabled={action.disabled}
      accessibilityLabel={action.accessibilityLabel}
      testId={action.testId}
      id={action.id}
    >
      {action.content}
    </Button>
  );
  const hasActions = !!primaryAction || others.length > 0 || destructive.length > 0;

  return createPortal(
    <div ref={rootRef} className="p-sheet-root" inert={!open}>
      <div className="p-sheet-backdrop" onClick={onClose} />
      <div
        ref={panelRef}
        className={cx('p-sheet', size && `p-sheet--${size}`, background === 'subdued' && 'p-sheet--subdued', className)}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
      >
        <div className="p-sheet__header">
          <div className="p-sheet__heading">
            <h2 id={titleId} className="p-sheet__title">
              {title}
            </h2>
            {titleMetadata}
          </div>
          {subtitle ? (
            <div id={subtitleId} className="p-sheet__subtitle">
              {subtitle}
            </div>
          ) : null}
          <div className="p-sheet__actions">
            {(headerActions || []).map((action, i) => (
              <Button
                key={i}
                variant="tertiary"
                icon={action.icon}
                onClick={action.onAction}
                url={action.url}
                external={action.external}
                loading={action.loading}
                disabled={action.disabled}
                accessibilityLabel={action.accessibilityLabel}
                title={action.content ? undefined : action.accessibilityLabel}
                testId={action.testId}
                id={action.id}
              >
                {action.content}
              </Button>
            ))}
            <Button variant="tertiary" icon="CancelMajor" accessibilityLabel="Close" onClick={onClose} />
          </div>
        </div>
        <div className={cx('p-sheet__body', padding === '0' && 'p-sheet__body--flush')}>{children}</div>
        {footer ? (
          <div className="p-sheet__footer">{footer}</div>
        ) : hasActions ? (
          <div className="p-sheet__footer">
            {destructive.length ? (
              <ButtonGroup className="p-sheet__footer-start">{destructive.map((a, i) => actionButton(a, i))}</ButtonGroup>
            ) : null}
            <ButtonGroup>
              {others.map((a, i) => actionButton(a, i))}
              {primaryAction ? actionButton(primaryAction, others.length, 'primary') : null}
            </ButtonGroup>
          </div>
        ) : null}
      </div>
    </div>,
    target,
  );
}
