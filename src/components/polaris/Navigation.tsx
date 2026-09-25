import * as React from 'react';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { UnstyledLink } from './PolarisProvider';
import type { IconSource } from './types';
import { cx } from './utils';

export interface SubNavigationItem {
  label: string;
  url?: string;
  selected?: boolean;
  /** Count shown on the right. */
  badge?: string;
  /** DOM id on the link, e.g. an onboarding-tour anchor. */
  id?: string;
}

export interface NavigationItem {
  label: string;
  icon?: IconSource;
  url?: string;
  selected?: boolean;
  /** Count shown on the right, e.g. unfulfilled orders. */
  badge?: string;
  disabled?: boolean;
  onClick?: () => void;
  /** Shown under the item while it is selected. */
  subNavigationItems?: SubNavigationItem[];
  /** DOM id on the link, e.g. an onboarding-tour anchor. */
  id?: string;
}

export interface NavigationSectionProps {
  items: NavigationItem[];
  title?: string;
  /** Pushes this section to fill the remaining height (e.g. Apps). */
  fill?: boolean;
  action?: { icon?: IconSource; accessibilityLabel: string; onClick?: () => void };
  className?: string;
}

export interface NavigationProps {
  children?: React.ReactNode;
  /** DOM id on the <nav>. */
  id?: string;
  className?: string;
}

function NavigationBase({ children, id, className }: NavigationProps) {
  return (
    <nav id={id} className={cx('p-nav', className)}>
      {children}
    </nav>
  );
}

/** A group of navigation items, optionally titled. Also available as `Navigation.Section`. */
export function NavigationSection({ items, title, fill, action, className }: NavigationSectionProps) {
  return (
    <div className={cx('p-nav__section', fill && 'p-nav__section--fill', className)}>
      {title ? (
        <div className="p-nav__section-title">
          <span>{title}</span>
          {action ? (
            <button type="button" className="p-nav__section-action" aria-label={action.accessibilityLabel} onClick={action.onClick}>
              <Icon source={action.icon || 'ChevronRightMinor'} />
            </button>
          ) : null}
        </div>
      ) : null}
      <ul className="p-nav__list">
        {(items || []).map((it, i) => (
          <li key={i}>
            <UnstyledLink
              id={it.id}
              url={it.url || '#'}
              className={cx('p-nav__item', it.selected && 'p-nav__item--selected', it.disabled && 'p-nav__item--disabled')}
              onClick={it.onClick}
              aria-current={it.selected ? 'page' : undefined}
              aria-disabled={it.disabled || undefined}
              tabIndex={it.disabled ? -1 : undefined}
            >
              {it.icon ? <Icon source={it.icon} /> : null}
              <span className="p-nav__label">{it.label}</span>
              {it.badge ? <Badge>{it.badge}</Badge> : null}
            </UnstyledLink>
            {it.selected && it.subNavigationItems ? (
              <ul className="p-nav__sub">
                {it.subNavigationItems.map((s, j) => (
                  <li key={j}>
                    <UnstyledLink
                      id={s.id}
                      url={s.url || '#'}
                      className={cx('p-nav__subitem', s.selected && 'p-nav__subitem--selected')}
                      aria-current={s.selected ? 'page' : undefined}
                    >
                      <span className="p-nav__label">{s.label}</span>
                      {s.badge ? <Badge>{s.badge}</Badge> : null}
                    </UnstyledLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The admin sidebar (nav-bg, 240px). Compose with `Navigation.Section` (or `NavigationSection` in Server Components). */
export const Navigation = Object.assign(NavigationBase, { Section: NavigationSection });
