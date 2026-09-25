import * as React from 'react';
import { Button, buttonFrom } from './Button';
import { ButtonGroup } from './ButtonGroup';
import type { Action } from './types';
import { cx } from './utils';

export interface CalloutCardProps {
  title: string;
  children?: React.ReactNode;
  /** Illustration URL (right side). */
  illustration?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  onDismiss?: () => void;
  className?: string;
}

/** A card that promotes a feature or next step, with an illustration. */
export function CalloutCard({ title, children, illustration, primaryAction, secondaryAction, onDismiss, className }: CalloutCardProps) {
  return (
    <div className={cx('p-card p-callout', className)}>
      <div className="p-callout__content">
        <h2 className="p-card__title">{title}</h2>
        <div>{children}</div>
        <ButtonGroup>
          {buttonFrom(primaryAction)}
          {secondaryAction ? (
            <Button variant="tertiary" onClick={secondaryAction.onAction} url={secondaryAction.url}>
              {secondaryAction.content}
            </Button>
          ) : null}
        </ButtonGroup>
      </div>
      {illustration ? <img className="p-callout__image" src={illustration} alt="" /> : null}
      {onDismiss ? (
        <div className="p-callout__dismiss">
          <Button variant="tertiary" icon="CancelSmallMinor" accessibilityLabel="Dismiss card" onClick={onDismiss} />
        </div>
      ) : null}
    </div>
  );
}
