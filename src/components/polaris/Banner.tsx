import * as React from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import type { Action, IconSource } from './types';
import { cx } from './utils';

const BANNER_ICON = { info: 'InfoMinor', success: 'TickMinor', warning: 'RiskMajor', critical: 'AlertMinor' } as const;

export interface BannerProps {
  title?: string;
  children?: React.ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'critical';
  icon?: IconSource;
  action?: Action;
  secondaryAction?: Action;
  onDismiss?: () => void;
  className?: string;
}

/** Prominent message about the page or a section: info, success, warning, critical. */
export function Banner({ title, children, tone: toneProp, icon, action, secondaryAction, onDismiss, className }: BannerProps) {
  const tone = toneProp || 'info';
  const role = tone === 'critical' || tone === 'warning' ? 'alert' : 'status';
  const actions =
    action || secondaryAction ? (
      <div className="p-banner__actions">
        {action ? (
          <Button onClick={action.onAction} url={action.url} external={action.external}>
            {action.content}
          </Button>
        ) : null}
        {secondaryAction ? (
          <Button variant="tertiary" onClick={secondaryAction.onAction} url={secondaryAction.url} external={secondaryAction.external}>
            {secondaryAction.content}
          </Button>
        ) : null}
      </div>
    ) : null;
  const dismiss = onDismiss ? (
    <Button variant="tertiary" icon="CancelSmallMinor" accessibilityLabel="Dismiss notification" onClick={onDismiss} />
  ) : null;

  if (!title) {
    return (
      <div className={cx('p-banner', `p-banner--${tone}`, 'p-banner--untitled', className)} role={role}>
        <div className="p-banner__badge">
          <Icon source={icon || BANNER_ICON[tone]} />
        </div>
        <div className="p-banner__message">
          <div>{children}</div>
          {actions}
        </div>
        {dismiss}
      </div>
    );
  }
  return (
    <div className={cx('p-banner', `p-banner--${tone}`, className)} role={role}>
      <div className="p-banner__head">
        <Icon source={icon || BANNER_ICON[tone]} />
        <h2 className="p-banner__title">{title}</h2>
        {dismiss}
      </div>
      {children || actions ? (
        <div className="p-banner__body">
          {children ? <div>{children}</div> : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
