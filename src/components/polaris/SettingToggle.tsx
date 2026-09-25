import * as React from 'react';
import { Badge } from './Badge';
import { Button } from './Button';
import { cx } from './utils';

export interface SettingToggleProps {
  title: React.ReactNode;
  enabled?: boolean;
  onToggle?: () => void;
  /** Explanation of what the setting does. */
  children?: React.ReactNode;
  className?: string;
}

/** A card that turns a setting on or off, with an On/Off badge. */
export function SettingToggle({ title, enabled, onToggle, children, className }: SettingToggleProps) {
  return (
    <div className={cx('p-card p-setting', className)}>
      <div className="p-setting__head">
        <div className="p-setting__title">
          {title}
          <Badge tone={enabled ? 'success' : undefined}>{enabled ? 'On' : 'Off'}</Badge>
        </div>
        <Button variant={enabled ? 'secondary' : 'primary'} onClick={onToggle}>
          {enabled ? 'Turn off' : 'Turn on'}
        </Button>
      </div>
      {children ? <div>{children}</div> : null}
    </div>
  );
}
