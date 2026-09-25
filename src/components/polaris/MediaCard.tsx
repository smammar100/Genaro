import * as React from 'react';
import { Button, buttonFrom } from './Button';
import { ButtonGroup } from './ButtonGroup';
import type { Action } from './types';
import { cx } from './utils';

export interface MediaCardProps {
  title: string;
  description?: string;
  /** The media: an <img> or a VideoThumbnail. */
  children?: React.ReactNode;
  primaryAction?: Action;
  secondaryAction?: Action;
  /** Media beside the text (40% width) instead of above it. */
  portrait?: boolean;
  /** Reserved (no visual difference yet). */
  size?: 'small' | 'medium';
  className?: string;
}

/** Card pairing an image or video with a title, description and actions. */
export function MediaCard({ title, description, children, primaryAction, secondaryAction, portrait, size, className }: MediaCardProps) {
  return (
    <div className={cx('p-card p-card--flush p-mediacard', portrait && 'p-mediacard--portrait', size === 'small' && 'p-mediacard--small', className)}>
      <div className="p-mediacard__media">{children}</div>
      <div className="p-mediacard__content">
        <h2 className="p-card__title">{title}</h2>
        {description ? <p className="p-mediacard__desc">{description}</p> : null}
        <ButtonGroup>
          {buttonFrom(primaryAction)}
          {secondaryAction ? (
            <Button variant="tertiary" onClick={secondaryAction.onAction} url={secondaryAction.url}>
              {secondaryAction.content}
            </Button>
          ) : null}
        </ButtonGroup>
      </div>
    </div>
  );
}
