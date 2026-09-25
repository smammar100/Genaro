import * as React from 'react';
import { cx } from './utils';

const AVATAR_SIZES = { xs: 20, sm: 24, md: 28, lg: 32, xl: 40 } as const;
const PALETTE = ['one', 'two', 'three', 'four', 'five'] as const;

export interface AvatarProps {
  /** Renders the avatar with a text label beside it. */
  label?: React.ReactNode;
  /** Person or store name — drives initials and the color. */
  name?: string;
  initials?: string;
  /** Image URL. */
  source?: string;
  /** xs 20 · sm 24 · md 28 (default) · lg 32 · xl 40. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  accessibilityLabel?: string;
  className?: string;
}

/** Customer, staff or store avatar: image, initials or placeholder silhouette. */
export function Avatar({ label, name: nameProp, initials: initialsProp, source, size: sizeProp, accessibilityLabel, className }: AvatarProps) {
  const size = sizeProp && Object.prototype.hasOwnProperty.call(AVATAR_SIZES, sizeProp) ? sizeProp : 'md';
  const name = nameProp || '';
  const initials =
    initialsProp ||
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  const style = name ? PALETTE[n % 5] : 'grey';

  const avatar = (
    <span
      className={cx('p-avatar', `p-avatar--${size}`, `p-avatar--${style}`, !label && className)}
      role={label ? undefined : 'img'}
      aria-label={label ? undefined : accessibilityLabel || name || 'Avatar'}
      aria-hidden={label ? true : undefined}
    >
      {source ? (
        <img src={source} alt="" />
      ) : initials ? (
        <span className="p-avatar__initials">{initials}</span>
      ) : (
        <svg viewBox="0 0 40 40" aria-hidden>
          <path
            fill="currentColor"
            d="M8.28 27.5A14.95 14.95 0 0120 21.8c4.76 0 8.97 2.24 11.72 5.7a14.02 14.02 0 01-8.25 5.91c-.47.1-.97.1-1.47.1h-4c-.5 0-1 0-1.47-.1a14.02 14.02 0 01-8.25-5.91zM13.99 12.78a6.02 6.02 0 1112.03 0 6.02 6.02 0 01-12.03 0z"
          />
        </svg>
      )}
    </span>
  );
  if (!label) return avatar;
  return (
    <span className={cx('p-avatar-label', className)}>
      {avatar}
      <span>{label}</span>
    </span>
  );
}
