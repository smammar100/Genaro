import type * as React from 'react';
import type { IconName } from './icons';

/** A Polaris icon name (e.g. `'OrdersMinor'`) or any React element, such as a lucide-react icon. */
export type IconSource = IconName | React.ReactElement;

/**
 * A simple action, rendered as a Button.
 * Use `url` to navigate (works from Server Components); use `onAction` to run code (Client Components only).
 */
export interface Action {
  content: string;
  onAction?: () => void;
  url?: string;
  external?: boolean;
  accessibilityLabel?: string;
  /** Rendered as `data-testid` on the action's button or link. */
  testId?: string;
  /** DOM id on the action's button or link, e.g. an onboarding-tour anchor. */
  id?: string;
}

/** An item in an ActionList, SplitButton menu or Tabs menu. */
export interface MenuItem {
  content: string;
  icon?: IconSource;
  helpText?: string;
  /** Trailing content: an icon name or any node. */
  suffix?: React.ReactNode;
  destructive?: boolean;
  active?: boolean;
  disabled?: boolean;
  onAction?: () => void;
  url?: string;
}

/** A value per breakpoint: xs < 490px ≤ sm < 768px ≤ md < 1040px ≤ lg < 1440px ≤ xl. */
export type Breakpoints<T> = { xs?: T; sm?: T; md?: T; lg?: T; xl?: T };
