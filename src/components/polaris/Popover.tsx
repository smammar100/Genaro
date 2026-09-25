'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cx } from './utils';

export interface PopoverProps {
  /** The element that opens it, usually a Button with `disclosure`. */
  activator: React.ReactNode;
  active: boolean;
  /** Called on Escape and on clicks outside. */
  onClose?: () => void;
  children?: React.ReactNode;
  preferredAlignment?: 'left' | 'right';
  /** Open below (default) or above the activator. */
  preferredPosition?: 'below' | 'above';
  /** Pads the content 16px. */
  sectioned?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/** Gap between the activator and the panel (space-100). */
const GAP = 4;

/**
 * Floating panel anchored to an activator (shadow-300). Hold an ActionList, OptionList or a small form.
 * The panel is portalled to <body> and positioned against the activator, so a scrolling or
 * `overflow: hidden` container (a table, a card) can't clip it; it follows scrolls and resizes, sits
 * above modals, and keeps the theme of the subtree its activator is in.
 */
export function Popover({ activator, active, onClose, children, preferredAlignment, preferredPosition, sectioned, fullWidth, className }: PopoverProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!active || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [active, onClose]);
  React.useLayoutEffect(() => {
    if (!active) return;
    const place = () => {
      const anchor = ref.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const r = anchor.getBoundingClientRect();
      const st = panel.style;
      st.position = 'fixed';
      st.zIndex = '950';
      if (preferredPosition === 'above') {
        st.top = 'auto';
        st.bottom = `${window.innerHeight - r.top + GAP}px`;
      } else {
        st.top = `${r.bottom + GAP}px`;
        st.bottom = 'auto';
      }
      if (preferredAlignment === 'right') {
        st.left = 'auto';
        st.right = `${document.documentElement.clientWidth - r.right}px`;
      } else {
        st.left = `${r.left}px`;
        st.right = 'auto';
      }
      if (fullWidth) st.width = `${r.width}px`;
      const theme = anchor.closest('[data-theme]')?.getAttribute('data-theme');
      if (theme) panel.setAttribute('data-theme', theme);
      else panel.removeAttribute('data-theme');
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [active, preferredAlignment, preferredPosition, fullWidth]);
  return (
    <div ref={ref} className={cx('p-popover', className)}>
      {activator}
      {active && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              className={cx(
                'p-popover__panel',
                preferredAlignment === 'right' && 'p-popover__panel--right',
                preferredPosition === 'above' && 'p-popover__panel--above',
                sectioned && 'p-popover__panel--sectioned',
              )}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
