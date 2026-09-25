import { iconNames, iconPaths, isIconName } from './icons';
import type { IconSource } from './types';
import { cx } from './utils';

export type IconTone =
  | 'base' | 'subdued' | 'secondary' | 'info' | 'success' | 'warning' | 'critical' | 'emphasis' | 'magic' | 'inherit';

export interface IconProps {
  /** An icon name from the Polaris set (e.g. `'OrdersMinor'`) or any React element (e.g. a lucide-react icon). */
  source: IconSource;
  /** Ink color; defaults to the `icon` token. */
  tone?: IconTone;
  /** Makes the icon meaningful to screen readers; omit for decorative icons. */
  accessibilityLabel?: string;
  className?: string;
}

function IconBase({ source, tone, accessibilityLabel, className }: IconProps) {
  const cls = cx('p-icon', tone && `p-icon--${tone}`, className);
  if (!isIconName(source)) {
    if (source && typeof source !== 'string') {
      return (
        <span
          className={cls}
          aria-hidden={accessibilityLabel ? undefined : true}
          role={accessibilityLabel ? 'img' : undefined}
          aria-label={accessibilityLabel}
        >
          {source}
        </span>
      );
    }
    return null;
  }
  return (
    <span
      className={cls}
      aria-hidden={accessibilityLabel ? undefined : true}
      role={accessibilityLabel ? 'img' : undefined}
      aria-label={accessibilityLabel}
    >
      <svg viewBox="0 0 20 20" focusable="false">
        {iconPaths[source].split('|').map((d, i) =>
          d.startsWith('~') ? <path key={i} d={d.slice(1)} fillRule="evenodd" /> : <path key={i} d={d} />,
        )}
      </svg>
    </span>
  );
}

/** A 20×20 Polaris glyph. `Icon.names` lists every available name. */
export const Icon = Object.assign(IconBase, { names: iconNames });
