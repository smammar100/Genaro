import { cx } from './utils';

export interface SkeletonDisplayTextProps {
  size?: 'small' | 'medium' | 'large' | 'extraLarge';
  className?: string;
}

/** Placeholder for a heading while content loads. */
export function SkeletonDisplayText({ size, className }: SkeletonDisplayTextProps) {
  return <div className={cx('p-skel-display', `p-skel-display--${size || 'medium'}`, className)} />;
}

export interface SkeletonBodyTextProps {
  /** Number of lines (default 3). */
  lines?: number;
  className?: string;
}

/** Placeholder for body text while content loads. */
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

/** Placeholder for a Thumbnail while content loads. */
export function SkeletonThumbnail({ size, className }: SkeletonThumbnailProps) {
  return <div className={cx('p-skel-thumb', `p-thumb--${size || 'medium'}`, className)} />;
}
