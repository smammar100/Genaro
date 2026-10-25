'use client';

import * as React from 'react';
import { ActionList, type ActionListSection } from './ActionList';
import { Button, type ButtonProps } from './Button';
import { Popover } from './Popover';
import type { IconSource, MenuItem } from './types';

/** What `renderActivator` gets to wire up its own element. */
export interface ActionMenuActivatorProps {
  /** Opens and closes the menu: the element's click handler. */
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  /** Whether the menu is open, for `aria-expanded`. */
  open: boolean;
  /** Put this id on the focusable element: focus returns to it when the menu closes, and it labels the menu. */
  id: string;
  /** The menu's id while it is open, for `aria-controls`. */
  menuId?: string;
}

export interface ActionMenuProps {
  /** The actions, as one group. */
  items?: MenuItem[];
  /** Groups divided by a rule, with optional titles. Put destructive actions in a last group of their own. Wins over `items`. */
  sections?: ActionListSection[];
  /** The button's label: "More actions", or a verb + noun. Leave it out for an icon-only button. */
  label?: string;
  /** The button's icon. With no `label` it makes an icon-only button, which defaults to three dots. */
  icon?: IconSource;
  /** Required with no `label`: names the menu for screen readers ("Deal actions", "Job actions for OY70 TZG"). */
  accessibilityLabel?: string;
  /** `secondary` when it has a label, `tertiary` when icon-only. */
  variant?: ButtonProps['variant'];
  /** `micro` (24px) in table rows and cards, `medium` (default) elsewhere. */
  size?: ButtonProps['size'];
  disabled?: boolean;
  /** Line the menu up with the button's `left` (default) or `right` edge; `right` for buttons at the end of a row or header. */
  preferredAlignment?: 'left' | 'right';
  /** Open `below` (default) or `above` the button, near the bottom of the screen. */
  preferredPosition?: 'below' | 'above';
  /** Starts open (docs and previews). */
  defaultOpen?: boolean;
  /** Your own activator instead of the button. Spread its props onto a focusable element. */
  renderActivator?: (props: ActionMenuActivatorProps) => React.ReactNode;
  /** Rendered as `data-testid` on the button. */
  testId?: string;
  /** Classes on the wrapper. */
  className?: string;
}

const ITEMS = '[role="menuitem"]:not([disabled])';

/**
 * A button that opens a menu of actions: a record's "More actions", or the three-dot menu at the end of a
 * row. Arrow keys move through the items; choosing one, Escape and a click outside close the menu, and
 * focus returns to the button. Built from Popover, ActionList and Button.
 * @import import { ActionMenu } from "@/components/genaro";
 */
export function ActionMenu({
  items, sections, label, icon, accessibilityLabel, variant, size, disabled, preferredAlignment, preferredPosition,
  defaultOpen, renderActivator, testId, className,
}: ActionMenuProps) {
  // How the menu was opened: from the keyboard its first item takes focus,
  // from a pointer the menu does (no focus ring), from defaultOpen nothing does.
  const [state, setState] = React.useState<{ open: boolean; openedBy: 'keyboard' | 'pointer' | null }>({
    open: !!defaultOpen,
    openedBy: null,
  });
  const { open } = state;
  const activatorId = React.useId();
  const menuId = React.useId();
  const menuRef = React.useRef<HTMLDivElement>(null);

  const close = React.useCallback(() => {
    // Focus left inside the menu goes back to the button rather than to <body>.
    if (menuRef.current?.contains(document.activeElement)) document.getElementById(activatorId)?.focus();
    setState({ open: false, openedBy: null });
  }, [activatorId]);

  const toggle = (event: React.MouseEvent<HTMLElement>) => {
    const openedBy = event.detail === 0 ? 'keyboard' : 'pointer';
    setState((s) => ({ open: !s.open, openedBy }));
  };

  React.useEffect(() => {
    document.getElementById(activatorId)?.setAttribute('aria-haspopup', 'menu');
  }, [activatorId]);

  React.useEffect(() => {
    const menu = menuRef.current;
    if (!state.open || !menu) return;
    menu.querySelector('[role="menu"]')?.setAttribute('aria-labelledby', activatorId);
    if (state.openedBy === 'keyboard') menu.querySelector<HTMLElement>(ITEMS)?.focus();
    else if (state.openedBy === 'pointer') menu.focus();
  }, [state, activatorId]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const menu = menuRef.current;
    if (!menu) return;
    if (event.key === 'Tab') {
      // Leave the menu as if from the button, so Tab carries on through the page.
      document.getElementById(activatorId)?.focus();
      setState({ open: false, openedBy: null });
      return;
    }
    const all = Array.from(menu.querySelectorAll<HTMLElement>(ITEMS));
    if (!all.length) return;
    const at = all.indexOf(document.activeElement as HTMLElement);
    let next: HTMLElement | undefined;
    if (event.key === 'ArrowDown') next = all[(at + 1) % all.length];
    else if (event.key === 'ArrowUp') next = all[at <= 0 ? all.length - 1 : at - 1];
    else if (event.key === 'Home') next = all[0];
    else if (event.key === 'End') next = all[all.length - 1];
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  const iconOnly = !label;
  const activator = renderActivator ? (
    renderActivator({ onClick: toggle, open, id: activatorId, menuId: open ? menuId : undefined })
  ) : (
    <Button
      id={activatorId}
      variant={variant || (iconOnly ? 'tertiary' : 'secondary')}
      size={size}
      icon={icon || (iconOnly ? 'HorizontalDotsMinor' : undefined)}
      disclosure={!iconOnly}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      title={iconOnly ? accessibilityLabel : undefined}
      ariaExpanded={open}
      ariaControls={open ? menuId : undefined}
      testId={testId}
      onClick={toggle}
    >
      {label}
    </Button>
  );

  return (
    <Popover
      active={open}
      onClose={close}
      activator={activator}
      preferredAlignment={preferredAlignment}
      preferredPosition={preferredPosition}
      className={className}
    >
      <div ref={menuRef} id={menuId} tabIndex={-1} className="p-actionmenu" onKeyDown={onKeyDown}>
        <ActionList items={items} sections={sections} onActionAnyItem={close} />
      </div>
    </Popover>
  );
}
