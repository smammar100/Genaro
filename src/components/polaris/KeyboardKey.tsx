import * as React from 'react';
import { cx } from './utils';

export interface KeyboardKeyProps {
  children?: React.ReactNode;
  size?: 'small';
  /** For use on dark chrome (top bar). */
  dark?: boolean;
  className?: string;
}

/** A keyboard key or shortcut, e.g. ⌘K. */
export function KeyboardKey({ children, size, dark, className }: KeyboardKeyProps) {
  return <kbd className={cx('p-kbd', size === 'small' && 'p-kbd--small', dark && 'p-kbd--dark', className)}>{children}</kbd>;
}
