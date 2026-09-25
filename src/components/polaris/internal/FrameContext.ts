'use client';

import * as React from 'react';
import type { ContextualSaveBarProps } from '../ContextualSaveBar';

/** What Frame shares with the TopBar inside it (no cloneElement, so it works across the Server/Client boundary). */
export interface FrameContextValue {
  /** Frame has a navigation, so the TopBar should show the menu toggle. */
  hasNavigation: boolean;
  toggleNavigation: () => void;
  contextualSaveBar?: ContextualSaveBarProps;
}

export const FrameContext = React.createContext<FrameContextValue | null>(null);
