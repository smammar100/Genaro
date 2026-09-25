import { cx } from './utils';

export interface SpinnerProps {
  /** `large` (44px) by default; `small` (20px) inside buttons and fields. */
  size?: 'small' | 'large';
  accessibilityLabel?: string;
  className?: string;
}

/** Indeterminate loading indicator. */
export function Spinner({ size, accessibilityLabel, className }: SpinnerProps) {
  const s = size === 'small' ? 'small' : 'large';
  return (
    <span className={cx('p-spinner', `p-spinner--${s}`, className)} role="status" aria-label={accessibilityLabel || 'Loading'}>
      <svg viewBox="0 0 20 20">
        <path d="M7.229 1.173a9.25 9.25 0 1 0 11.655 11.412 1.25 1.25 0 1 0-2.4-.698 6.75 6.75 0 1 1-8.506-8.329 1.25 1.25 0 1 0-.75-2.385z" />
      </svg>
    </span>
  );
}
