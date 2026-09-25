import * as React from 'react';
import { Button } from './Button';
import { InlineError } from './InlineError';
import type { Action } from './types';
import { cx } from './utils';

export interface LabelledProps {
  id: string;
  label?: React.ReactNode;
  labelHidden?: boolean;
  labelAction?: Action;
  /** A string shows an InlineError; `true` only marks the field invalid. */
  error?: React.ReactNode | boolean;
  helpText?: React.ReactNode;
  requiredIndicator?: boolean;
  children?: React.ReactNode;
}

/** Label + help text + error wrapper used by TextField and Select; use it for custom controls. */
export function Labelled({ id, label, labelHidden, labelAction, error, helpText, requiredIndicator, children }: LabelledProps) {
  return (
    <div className="p-labelled">
      {label ? (
        <div className={cx('p-labelled__label', labelHidden && 'p-visually-hidden')}>
          <label htmlFor={id}>
            {label}
            {requiredIndicator ? <span className="p-labelled__req">{' *'}</span> : null}
          </label>
          {labelAction ? (
            <Button variant="plain" onClick={labelAction.onAction} url={labelAction.url}>
              {labelAction.content}
            </Button>
          ) : null}
        </div>
      ) : null}
      {children}
      {error && typeof error !== 'boolean' ? <InlineError message={error} id={`${id}-error`} /> : null}
      {helpText ? (
        <div className="p-labelled__help" id={`${id}-help`}>
          {helpText}
        </div>
      ) : null}
    </div>
  );
}
