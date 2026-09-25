'use client';

import * as React from 'react';
import type { ContextualSaveBarProps } from './ContextualSaveBar';
import { FrameContext } from './internal/FrameContext';
import type { TopBarProps } from './TopBar';
import { cx } from './utils';

export interface FrameProps {
  /** A <TopBar />; Frame wires its menu toggle and save bar through context. */
  topBar?: React.ReactElement<TopBarProps>;
  /** A <Navigation />; becomes a drawer below 1040px. */
  navigation?: React.ReactElement;
  /** Shows the unsaved-changes bar in the top bar. */
  contextualSaveBar?: ContextualSaveBarProps;
  /** Frame fills its parent's height; set e.g. "100dvh" when it is the page root. */
  height?: number | string;
  children?: React.ReactNode;
  className?: string;
}

/** The admin app shell: TopBar (bg-inverse) + Navigation (nav-bg) + scrolling main area (bg). */
export function Frame({ topBar, navigation, contextualSaveBar, height, children, className }: FrameProps) {
  const [navOpen, setNavOpen] = React.useState(false);
  const toggleNavigation = React.useCallback(() => setNavOpen((o) => !o), []);
  const context = React.useMemo(
    () => ({ hasNavigation: !!navigation, toggleNavigation, contextualSaveBar }),
    [navigation, toggleNavigation, contextualSaveBar],
  );
  return (
    <FrameContext.Provider value={context}>
      <div className={cx('p-frame', navOpen && 'p-frame--nav-open', className)} style={height ? { height } : undefined}>
        <div className="p-frame__topbar">{topBar || null}</div>
        <div className="p-frame__body">
          {navigation ? (
            <div
              className="p-frame__nav"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('a')) setNavOpen(false);
              }}
            >
              {navigation}
            </div>
          ) : null}
          {navigation ? <div className="p-frame__scrim" onClick={() => setNavOpen(false)} /> : null}
          <main className="p-frame__main">{children}</main>
        </div>
      </div>
    </FrameContext.Provider>
  );
}
