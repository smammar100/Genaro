import * as React from 'react';
import { buttonFrom } from './Button';
import { ButtonGroup } from './ButtonGroup';
import { Icon } from './Icon';
import type { Action, IconSource } from './types';
import { cx } from './utils';

export interface EmptyStateProps {
  heading?: string;
  children?: React.ReactNode;
  /** Illustration URL. */
  image?: string;
  /** Shown in a tinted circle when there is no image. */
  icon?: IconSource;
  action?: Action;
  secondaryAction?: Action;
  footerContent?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

/** First-use or no-results state explaining what goes here and how to start. */
export function EmptyState({ heading, children, image, icon, action, secondaryAction, footerContent, fullWidth, className }: EmptyStateProps) {
  return (
    <div className={cx('p-empty', fullWidth && 'p-empty--full', className)}>
      {image ? (
        <img className="p-empty__image" src={image} alt="" />
      ) : icon ? (
        <div className="p-empty__icon">
          <Icon source={icon} />
        </div>
      ) : null}
      <div className="p-empty__content">
        <div className="p-empty__text">
          {heading ? <h2 className="p-empty__heading">{heading}</h2> : null}
          {children ? <div className="p-empty__body">{children}</div> : null}
        </div>
        {action || secondaryAction ? (
          <ButtonGroup>
            {buttonFrom(secondaryAction)}
            {buttonFrom(action, { variant: 'primary' })}
          </ButtonGroup>
        ) : null}
        {footerContent ? <div className="p-empty__footer">{footerContent}</div> : null}
      </div>
    </div>
  );
}
