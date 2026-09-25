'use client';

import * as React from 'react';
import { Avatar } from './Avatar';
import { ContextualSaveBar, type ContextualSaveBarProps } from './ContextualSaveBar';
import { Icon } from './Icon';
import { FrameContext } from './internal/FrameContext';
import { KeyboardKey } from './KeyboardKey';
import { cx } from './utils';

export interface TopBarProps {
  /** Store logo or name (left). */
  logo?: React.ReactNode;
  /** Shown beside the avatar (right). */
  storeName?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Called when the search field gains focus, e.g. to open a command palette instead of typing in place. */
  onSearchFocus?: () => void;
  /** DOM id on the search field's wrapper, e.g. an onboarding-tour anchor. */
  searchId?: string;
  /** Shows the menu toggle; set automatically inside a Frame that has a navigation. */
  onNavigationToggle?: () => void;
  showSidekick?: boolean;
  onSidekickClick?: () => void;
  unreadNotifications?: boolean;
  onNotificationsClick?: () => void;
  /** Called by the store/avatar button (open your account menu). */
  onUserMenuClick?: () => void;
  /** Replaces search with the unsaved-changes bar (Frame sets this from its own prop). */
  contextualSaveBar?: ContextualSaveBarProps;
  className?: string;
}

/** 56px admin top bar on bg-inverse: logo, search (⌘K), Sidekick, notifications, store menu. */
export function TopBar({
  logo, storeName, searchPlaceholder, searchValue, onSearchChange, onSearchFocus, searchId, onNavigationToggle, showSidekick, onSidekickClick, unreadNotifications,
  onNotificationsClick, onUserMenuClick, contextualSaveBar, className,
}: TopBarProps) {
  const frame = React.useContext(FrameContext);
  const toggle = onNavigationToggle || (frame && frame.hasNavigation ? frame.toggleNavigation : undefined);
  const saveBar = (frame && frame.contextualSaveBar) || contextualSaveBar;
  return (
    <div className={cx('p-topbar-wrap', className)}>
      <header className="p-topbar">
        {toggle ? (
          <button type="button" className="p-topbar__navtoggle" aria-label="Toggle menu" onClick={toggle}>
            <Icon source="MobileHamburgerMajor" />
          </button>
        ) : null}
        <div className="p-topbar__logo">{logo || null}</div>
        {saveBar ? (
          <div className="p-topbar__csb">
            <ContextualSaveBar {...saveBar} />
          </div>
        ) : (
          <>
            <div className="p-topbar__search" id={searchId}>
              <Icon source="SearchMinor" />
              <input
                className="p-topbar__input"
                placeholder={searchPlaceholder || 'Search'}
                aria-label="Search"
                value={searchValue}
                onChange={onSearchChange ? (e) => onSearchChange(e.target.value) : undefined}
                onFocus={onSearchFocus}
              />
              <span className="p-topbar__kbd">
                <KeyboardKey dark>{'⌘K'}</KeyboardKey>
              </span>
            </div>
            <div className="p-topbar__right">
              {showSidekick !== false ? (
                <button type="button" className="p-topbar__iconbtn p-topbar__sidekick" aria-label="Sidekick" onClick={onSidekickClick}>
                  <Icon source="SidekickMajor" />
                </button>
              ) : null}
              <button
                type="button"
                className={cx('p-topbar__iconbtn', unreadNotifications && 'p-topbar__iconbtn--unread')}
                aria-label="Notifications"
                onClick={onNotificationsClick}
              >
                <Icon source="NotificationMajor" />
              </button>
              <button type="button" className="p-topbar__user" onClick={onUserMenuClick}>
                <span className="p-topbar__username">{storeName || 'Store'}</span>
                <Avatar name={storeName || 'Store'} size="md" />
              </button>
            </div>
          </>
        )}
      </header>
    </div>
  );
}
