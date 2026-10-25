import type * as React from 'react';
import { cx } from './utils';

export interface SkeletonDisplayTextProps {
  size?: 'small' | 'medium' | 'large' | 'extraLarge';
  className?: string;
}

/**
 * Placeholder for a heading while content loads.
 * @import import { SkeletonDisplayText } from "@/components/genaro";
 */
export function SkeletonDisplayText({ size, className }: SkeletonDisplayTextProps) {
  return <div className={cx('p-skel-display', `p-skel-display--${size || 'medium'}`, className)} />;
}

export interface SkeletonBodyTextProps {
  /** Number of lines (default 3). */
  lines?: number;
  className?: string;
}

/**
 * Placeholder for body text while content loads.
 * @import import { SkeletonBodyText } from "@/components/genaro";
 */
export function SkeletonBodyText({ lines, className }: SkeletonBodyTextProps) {
  const n = lines || 3;
  return (
    <div className={cx('p-skel-body', className)}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="p-skel-line" />
      ))}
    </div>
  );
}

export interface SkeletonThumbnailProps {
  size?: 'extraSmall' | 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * Placeholder for a Thumbnail while content loads.
 * @import import { SkeletonThumbnail } from "@/components/genaro";
 */
export function SkeletonThumbnail({ size, className }: SkeletonThumbnailProps) {
  return <div className={cx('p-skel-thumb', `p-thumb--${size || 'medium'}`, className)} />;
}

/** A step of the radius scale: `'200'` is `var(--radius-200)` (8px), `'full'` a pill or circle. */
export type SkeletonRadius = '0' | '050' | '100' | '150' | '200' | '300' | '400' | '500' | '750' | 'full';

const RADII: readonly string[] = ['0', '050', '100', '150', '200', '300', '400', '500', '750', 'full'];

/** A number (or a bare number in a string) is pixels; any other string is a CSS length. */
const length = (v: number | string) => (typeof v === 'number' || /^\d+(\.\d+)?$/.test(v) ? `${v}px` : v);

export interface SkeletonBoxProps {
  /** A number of pixels or any CSS length (`'100%'`, `'12rem'`, `'var(--space-1600)'`). Defaults to the full width. */
  width?: number | string;
  /** A number of pixels or any CSS length. Defaults to 20px, one line of body text. Ignored with `aspectRatio`. */
  height?: number | string;
  /** A radius step (`'200'`, `'300'`, `'full'`…) or any CSS length. Defaults to `'200'` (8px); match the box it replaces. */
  radius?: SkeletonRadius | (string & {}) | number;
  /** Width to height, such as `'4 / 3'` or `1`, for media whose height follows its width. Replaces `height`. */
  aspectRatio?: number | string;
  /** Extra classes on the box, for layout (`absolute inset-0`, `col-span-2`) or Tailwind sizes (`h-72`). */
  className?: string;
}

/**
 * Placeholder of any size for shapes the other skeletons don't cover: a chart, a map, a photo, a calendar
 * cell or a short label. Pulses like them and stops under reduced motion.
 * @import import { SkeletonBox } from "@/components/genaro";
 */
export function SkeletonBox({ width, height, radius, aspectRatio, className }: SkeletonBoxProps) {
  const style: React.CSSProperties = {};
  if (width != null) style.width = length(width);
  if (aspectRatio != null) {
    style.aspectRatio = String(aspectRatio);
    style.height = 'auto';
  } else if (height != null) style.height = length(height);
  if (radius != null) style.borderRadius = typeof radius === 'string' && RADII.includes(radius) ? `var(--radius-${radius})` : length(radius);
  return <div className={cx('p-skel-box', className)} style={style} />;
}
