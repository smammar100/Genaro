import * as React from 'react';
import { Icon } from './Icon';
import { cx } from './utils';

export interface TagProps {
  children?: React.ReactNode;
  /** Adds a remove (×) button. */
  onRemove?: () => void;
  /** Makes the whole tag a button. */
  onClick?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  magic?: boolean;
  className?: string;
}

/** Keyword attached to an object (product tags, applied filters). */
export function Tag({ children, onRemove, onClick, disabled, accessibilityLabel, magic, className }: TagProps) {
  const cls = cx('p-tag', magic && 'p-tag--magic', disabled && 'p-tag--disabled', onClick && 'p-tag--clickable', onRemove && 'p-tag--removable', className);
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled}>
        <span className="p-tag__label">{children}</span>
      </button>
    );
  }
  return (
    <span className={cls}>
      <span className="p-tag__label" title={typeof children === 'string' ? children : undefined}>
        {children}
      </span>
      {onRemove ? (
        <button
          type="button"
          className="p-tag__remove"
          aria-label={`Remove ${accessibilityLabel || (typeof children === 'string' ? children : 'tag')}`}
          onClick={onRemove}
          disabled={disabled}
        >
          <Icon source="CancelSmallMinor" />
        </button>
      ) : null}
    </span>
  );
}
