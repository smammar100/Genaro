import { cx } from './utils';

export interface DividerProps {
  borderColor?: 'border' | 'border-secondary' | 'border-inverse';
  className?: string;
}

/** Horizontal rule between sections of a card. */
export function Divider({ borderColor, className }: DividerProps) {
  return <hr className={cx('p-divider', borderColor && `p-divider--${borderColor}`, className)} />;
}
