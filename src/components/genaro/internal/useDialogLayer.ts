'use client';

import * as React from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
/** Popovers that own Escape while open: Genaro's, and base-ui lists and menus (the same set Modal defers to). */
const OPEN_POPUPS = '.p-popover__panel, [data-open][data-slot="select-popup"], [data-open][data-slot="menu-popup"], [data-open][data-slot="combobox-popup"], [data-open][data-slot="popover-popup"]';
/** Dialog layers: Genaro Modal and Sheet (`aria-modal`), and open base-ui dialogs. */
const LAYERS = '[aria-modal="true"], [role="dialog"][data-open], [role="alertdialog"][data-open]';

/** Portals append to <body> in the order they open, so the last layer still on screen is the topmost. */
function isTopmost(node: HTMLElement) {
  const layers = Array.from(document.querySelectorAll<HTMLElement>(LAYERS)).filter((el) => !el.closest('[inert]'));
  return layers[layers.length - 1] === node;
}

/**
 * Makes `ref` a modal layer while `active`: moves focus into it (unless focus is already there, say on
 * an autofocused field), keeps Tab inside it, calls `onEscape` on Escape, locks page scroll, and returns
 * focus to the previously focused element when it ends. A popover open inside it and a dialog opened
 * above it (a confirmation Modal) take Escape and Tab first.
 */
export function useDialogLayer(active: boolean, ref: React.RefObject<HTMLElement | null>, onEscape: () => void) {
  const escape = React.useEffectEvent(onEscape);
  // The element to return focus to, read before this commit touches the DOM:
  // by the time effects run, an autoFocus field inside may already have focus.
  const opener = React.useRef<HTMLElement | null>(null);
  React.useInsertionEffect(() => {
    if (active) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [active]);
  React.useEffect(() => {
    const node = ref.current;
    if (!active || !node) return;
    const previous = opener.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!node.contains(document.activeElement)) node.focus();
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== 'Escape' && e.key !== 'Tab') || !isTopmost(node)) return;
      if (e.key === 'Escape') {
        // A Select list, calendar or menu open inside takes this Escape; the layer closes on the next one.
        if (!document.querySelector(OPEN_POPUPS)) escape();
        return;
      }
      const focused = document.activeElement;
      // Focus in a portalled popover (a menu, a calendar) is the popover's to move.
      if (focused instanceof Element && focused.closest(OPEN_POPUPS)) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (focused === first || focused === node || !node.contains(focused))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (focused === last || !node.contains(focused))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [active, ref]);
}
