import * as React from 'react';
import { buttonFrom } from './Button';
import { ButtonGroup } from './ButtonGroup';
import { Icon } from './Icon';
import type { Action, IconSource } from './types';
import { cx } from './utils';

export interface EmptyStateProps {
  heading?: string;
  children?: React.ReactNode;
  /** An EmptyStateIllustration (or any drawing). Takes precedence over `image` and `icon`. */
  illustration?: React.ReactNode;
  /** Illustration URL. */
  image?: string;
  /** Shown in a tinted circle when there is no image. */
  icon?: IconSource;
  action?: Action;
  secondaryAction?: Action;
  footerContent?: React.ReactNode;
  fullWidth?: boolean;
  /** Tighter padding, for an empty state inside a card. */
  compact?: boolean;
  className?: string;
}

/**
 * First-use or no-results state explaining what goes here and how to start.
 * @import import { EmptyState } from "@/components/genaro";
 */
export function EmptyState({ heading, children, illustration, image, icon, action, secondaryAction, footerContent, fullWidth, compact, className }: EmptyStateProps) {
  return (
    <div className={cx('p-empty', fullWidth && 'p-empty--full', compact && 'p-empty--compact', className)}>
      {illustration ? (
        illustration
      ) : image ? (
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
