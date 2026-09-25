import * as React from 'react';
import { Avatar } from './Avatar';
import { Button } from './Button';
import type { Action } from './types';
import { cx } from './utils';

export interface AccountConnectionProps {
  /** Title while not connected, e.g. "Facebook". */
  title?: string;
  /** Shown as the title once connected. */
  accountName?: string;
  connected?: boolean;
  avatarUrl?: string;
  details?: React.ReactNode;
  /** "Connect" / "Disconnect". */
  action?: Action;
  termsOfService?: React.ReactNode;
  className?: string;
}

/** Connect or disconnect an external account. */
export function AccountConnection({ title, accountName, connected, avatarUrl, details, action, termsOfService, className }: AccountConnectionProps) {
  return (
    <div className={cx('p-card p-account', className)}>
      <div className="p-account__head">
        {avatarUrl || connected ? <Avatar name={accountName} source={avatarUrl} size="lg" /> : null}
        <div className="p-account__text">
          <h2 className="p-card__title">{connected ? accountName : title}</h2>
          <div className="p-account__status">{details || (connected ? 'Account connected' : 'No account connected')}</div>
        </div>
        {action ? (
          <Button variant={connected ? 'secondary' : 'primary'} onClick={action.onAction} url={action.url}>
            {action.content}
          </Button>
        ) : null}
      </div>
      {termsOfService ? <div>{termsOfService}</div> : null}
    </div>
  );
}
