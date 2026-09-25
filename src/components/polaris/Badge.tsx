import * as React from 'react';
import { Icon } from './Icon';
import type { IconSource } from './types';
import { cx } from './utils';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'attention' | 'warning' | 'critical' | 'magic' | 'new';
export type BadgeProgress = 'incomplete' | 'partiallyComplete' | 'complete';

export interface BadgeProps {
  /** One or two status words: "Active", "Partially paid". */
  children?: React.ReactNode;
  tone?: BadgeTone;
  /** Adds the progress pip used for payment and fulfillment status. */
  progress?: BadgeProgress;
  strong?: boolean;
  size?: 'medium' | 'large';
  icon?: IconSource;
  className?: string;
}

function Pip({ progress }: { progress: BadgeProgress }) {
  const box = { x: 6.625, y: 6.625, width: 6.75, height: 6.75, rx: 2.4, stroke: 'currentColor', strokeWidth: 1.25 };
  if (progress === 'complete') return <rect {...box} fill="currentColor" />;
  if (progress === 'partiallyComplete') {
    return (
      <>
        <rect {...box} fill="none" />
        <path d="M6.625 10h6.75v1.4a2 2 0 0 1-2 2h-2.75a2 2 0 0 1-2-2z" fill="currentColor" />
      </>
    );
  }
  return <rect {...box} fill="none" />;
}

/** Status label for an object: product status, payment, fulfillment. */
export function Badge({ children, tone, progress, strong, size, icon, className }: BadgeProps) {
  return (
    <span
      className={cx('p-badge', `p-badge--${tone || 'neutral'}`, strong && 'p-badge--strong', size === 'large' && 'p-badge--large', progress && 'p-badge--progress', className)}
    >
      {progress ? (
        <svg className="p-badge__pip" viewBox="0 0 20 20" aria-hidden>
          <Pip progress={progress} />
        </svg>
      ) : null}
      {icon ? <Icon source={icon} /> : null}
      <span>{children}</span>
    </span>
  );
}
