import { cx } from './utils';

export interface ProgressBarProps {
  /** 0–100. */
  progress: number;
  size?: 'small' | 'medium' | 'large';
  tone?: 'highlight' | 'primary' | 'success' | 'critical';
  /** Width eases over 500ms unless false. */
  animated?: boolean;
  /** Names the bar for screen readers, e.g. "Setup progress". */
  accessibilityLabel?: string;
  className?: string;
}

/** Determinate progress of a task. */
export function ProgressBar({ progress, size, tone, animated, accessibilityLabel, className }: ProgressBarProps) {
  const p = Math.max(0, Math.min(100, progress || 0));
  return (
    <div
      className={cx('p-progress', `p-progress--${size || 'medium'}`, `p-progress--${tone || 'highlight'}`, className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={p}
      aria-label={accessibilityLabel}
    >
      <div className="p-progress__bar" style={{ width: `${p}%`, transition: animated === false ? 'none' : undefined }} />
    </div>
  );
}
