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
 * The panel is portalled (to <body>, or into the Genaro Modal it opens from) and fixed against the
 * activator, so a scrolling or `overflow: hidden` container (a table, a card) can't clip it; it follows
 * scrolls and resizes, stays inside the window, sits above modals, and keeps the theme of the subtree
 * its activator is in. Popovers nest: Escape and outside clicks close the innermost first.
 * @import import { Popover } from "@/components/genaro";
 */
export function Popover({ activator, active, onClose, children, preferredAlignment, preferredPosition, sectioned, fullWidth, className }: PopoverProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  // Inside a Genaro Modal or Sheet the panel is portalled into the dialog
  // (aria-modal hides everything outside it from assistive tech); elsewhere
  // into <body>.
  const [modal, setModal] = React.useState<HTMLElement | null>(null);
  const setAnchor = React.useCallback((el: HTMLDivElement | null) => {
    ref.current = el;
    setModal(el?.closest<HTMLElement>('.p-modal, .p-sheet') ?? null);
  }, []);
  React.useEffect(() => {
    if (!active || !onClose) return;
    // Popovers nest (a Select list inside a filter panel): panels are appended
    // to <body> in the order they open, so the last one is the innermost.
    // Escape closes only that one, and a click in a nested panel is not a
    // click outside this one.
    const innermost = () => {
      const panels = document.querySelectorAll('.p-popover__panel');
      return panels[panels.length - 1] === panelRef.current;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && innermost()) onClose();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (ref.current?.contains(t) || panelRef.current?.contains(t) || t.closest?.('.p-popover__panel')) return;
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
      const st = panel.style;
      // Fix the panel in place before measuring: left in the flow at the foot
      // of <body>, it can add a page scrollbar for a moment and shift the
      // activator it is about to be measured against.
      st.position = 'fixed';
      st.zIndex = '950';
      const r = anchor.getBoundingClientRect();
      // Keep the panel on screen: cap it to the room between the activator and
      // the viewport edge, and scroll inside it (long lists such as a
      // 70-column picker would otherwise run off the bottom, unreachable).
      const EDGE = 12;
      if (preferredPosition === 'above') {
        st.top = 'auto';
        st.bottom = `${window.innerHeight - r.top + GAP}px`;
        st.maxHeight = `${Math.max(160, r.top - GAP - EDGE)}px`;
      } else {
        st.top = `${r.bottom + GAP}px`;
        st.bottom = 'auto';
        st.maxHeight = `${Math.max(160, window.innerHeight - r.bottom - GAP - EDGE)}px`;
      }
      st.overflowY = 'auto';
      st.overscrollBehavior = 'contain';
      if (fullWidth) {
        st.width = `${r.width}px`;
        st.maxWidth = 'none';
      }
      // Line up with the activator, but never past either side of the window
      // (a calendar under a field near the right edge, any panel on a phone).
      const vw = document.documentElement.clientWidth;
      const room = Math.max(EDGE, vw - panel.offsetWidth - EDGE);
      if (preferredAlignment === 'right') {
        st.left = 'auto';
        st.right = `${Math.min(Math.max(EDGE, vw - r.right), room)}px`;
      } else {
        st.left = `${Math.min(Math.max(EDGE, r.left), room)}px`;
        st.right = 'auto';
      }
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
    <div ref={setAnchor} className={cx('p-popover', className)}>
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
            modal ?? document.body,
          )
        : null}
    </div>
  );
}
