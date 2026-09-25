import * as React from 'react';
import { Icon } from './Icon';
import { UnstyledLink } from './PolarisProvider';
import { Spinner } from './Spinner';
import type { Action, IconSource } from './types';
import { cx } from './utils';

export interface ButtonProps {
  /** The label: verb + noun in sentence case ("Add product"). */
  children?: React.ReactNode;
  /** `secondary` (default) · `primary` (one per view) · `tertiary` · `plain` · `monochromePlain`. */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'plain' | 'monochromePlain';
  /** `critical` for destructive actions, `success` for completing ones. */
  tone?: 'critical' | 'success';
  /** `micro` 24px · `medium` 28px (default) · `large` 32px. */
  size?: 'micro' | 'medium' | 'large';
  icon?: IconSource;
  /** Adds a chevron (down by default). */
  disclosure?: boolean | 'up' | 'down';
  pressed?: boolean;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  textAlign?: 'left' | 'center';
  /** Renders a link instead of a button. */
  url?: string;
  external?: boolean;
  /** type="submit" — use inside a <form>. */
  submit?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  /** Required for icon-only buttons. */
  accessibilityLabel?: string;
  /** For disclosure buttons that open a menu or panel. */
  ariaExpanded?: boolean;
  ariaControls?: string;
  /** Rendered as `data-testid` on the button or link. */
  testId?: string;
  /** DOM id on the button or link, e.g. an onboarding-tour anchor. */
  id?: string;
  /** Native tooltip text. */
  title?: string;
  className?: string;
  /** Any `data-*` attribute is passed through to the button or link. */
  [dataAttribute: `data-${string}`]: string | number | boolean | undefined;
}

/** Triggers an action or navigates. */
export function Button({
  children, variant, tone, size, icon, disclosure, pressed, loading, disabled, fullWidth, textAlign,
  url, external, submit, onClick, accessibilityLabel, ariaExpanded, ariaControls, testId, id, title, className,
  ...rest
}: ButtonProps) {
  const dataAttributes = Object.fromEntries(
    Object.entries(rest).filter(([key]) => key.startsWith('data-')),
  );
  const v = variant || 'secondary';
  const iconOnly = Boolean(icon) && !children;
  const cls = cx(
    'p-btn', `p-btn--${v}`, tone && `p-btn--tone-${tone}`, `p-btn--${size || 'medium'}`,
    fullWidth && 'p-btn--full', iconOnly && 'p-btn--icon-only', loading && 'p-btn--loading',
    pressed && 'p-btn--pressed', textAlign && `p-btn--align-${textAlign}`, className,
  );
  const inner = (
    <>
      {loading ? <Spinner size="small" accessibilityLabel="Loading" /> : null}
      {icon ? <Icon source={icon} /> : null}
      {children ? <span className="p-btn__label">{children}</span> : null}
      {disclosure ? <Icon source={disclosure === 'up' ? 'ChevronUpMinor' : 'ChevronDownMinor'} /> : null}
    </>
  );
  const common = {
    className: cls,
    'aria-label': accessibilityLabel,
    'aria-pressed': pressed != null ? !!pressed : undefined,
    'aria-busy': loading || undefined,
    'aria-expanded': ariaExpanded,
    'aria-controls': ariaControls,
    'data-testid': testId,
    id,
    title,
    ...dataAttributes,
    onClick,
  };
  if (url && !disabled) {
    return (
      <UnstyledLink url={url} external={external} {...common}>
        {inner}
      </UnstyledLink>
    );
  }
  return (
    <button type={submit ? 'submit' : 'button'} disabled={disabled || loading} {...common}>
      {inner}
    </button>
  );
}

/** An Action plus the button states some components accept. */
export type ButtonAction = Action & { disabled?: boolean; loading?: boolean; icon?: IconSource };

/** Renders an Action object as a Button (internal helper, also handy in your own components). */
export function buttonFrom(action: ButtonAction | undefined | null, overrides?: Partial<ButtonProps>) {
  if (!action) return null;
  return (
    <Button
      onClick={action.onAction}
      url={action.url}
      external={action.external}
      disabled={action.disabled}
      loading={action.loading}
      icon={action.icon}
      accessibilityLabel={action.accessibilityLabel}
      testId={action.testId}
      id={action.id}
      {...overrides}
    >
      {action.content}
    </Button>
  );
}
