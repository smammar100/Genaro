import type * as React from 'react';
import { Icon } from './Icon';
import { isIconName } from './icons';
import type { IconSource } from './types';
import { cx } from './utils';

export interface ThumbnailProps {
  /** Image URL, or an icon (name or element) for a placeholder. Defaults to ProductsMinor. */
  source?: string | IconSource;
  alt?: string;
  /** extraSmall 24 · small 40 · medium 60 (default) · large 80. */
  size?: 'extraSmall' | 'small' | 'medium' | 'large';
  /** A custom image element instead of `source`, e.g. next/image with `fill`. */
  children?: React.ReactNode;
  className?: string;
}

/** Small product or media preview with an inset edge. */
export function Thumbnail({ source, alt, size, children, className }: ThumbnailProps) {
  return (
    <span className={cx('p-thumb', `p-thumb--${size || 'medium'}`, className)}>
      {children ? (
        children
      ) : typeof source === 'string' && !isIconName(source) ? (
        <img src={source} alt={alt || ''} />
      ) : (
        <Icon source={source || 'ProductsMinor'} tone="subdued" />
      )}
    </span>
  );
}
