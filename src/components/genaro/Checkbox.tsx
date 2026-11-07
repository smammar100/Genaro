'use client';

import * as React from 'react';
import { InlineError } from './InlineError';
import { cx } from './utils';

export interface CheckboxProps {
  label: React.ReactNode;
  /** Controlled state; `'indeterminate'` shows a dash (e.g. "select all" with some rows selected). */
  checked?: boolean | 'indeterminate';
  defaultChecked?: boolean;
  onChange?: (checked: boolean, id: string) => void;
  helpText?: React.ReactNode;
  error?: React.ReactNode | boolean;
  disabled?: boolean;
  labelHidden?: boolean;
  name?: string;
  value?: string;
  magic?: boolean;
  /**
   * To-do lists: checking wipes a line through the label and greys it, so what's done reads as done. Off for
   * ordinary options ("Remember me", "Select all").
   */
  strike?: boolean;
  id?: string;
}

/**
 * Binary choice. Checking swells the bg-fill-brand-selected fill out of the box on a spring and draws the tick in
 * (after React Bits' Spring Check).
 * @import import { Checkbox } from "@/components/genaro";
 */
export function Checkbox(props: CheckboxProps) {
  const { label, helpText, error, disabled, labelHidden, name, value, magic, strike } = props;
  const autoId = React.useId();
  const id = props.id || autoId;
  const [inner, setInner] = React.useState(!!props.defaultChecked);
  const checked = props.checked != null ? props.checked : inner;
  const indeterminate = checked === 'indeterminate';
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div className={cx('p-choice', magic && 'p-choice--magic', disabled && 'p-choice--disabled', !!error && 'p-choice--error', strike && 'p-choice--strike')}>
      <label className="p-choice__row" htmlFor={id}>
        <span className="p-choice__control">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className="p-checkbox__input"
            name={name}
            value={value}
            checked={checked === true}
            disabled={disabled}
            onChange={(e) => {
              setInner(e.target.checked);
              props.onChange?.(e.target.checked, id);
            }}
            aria-invalid={error ? true : undefined}
            aria-checked={indeterminate ? 'mixed' : undefined}
            aria-describedby={error && typeof error !== 'boolean' ? `${id}-error` : helpText ? `${id}-help` : undefined}
          />
          <span className="p-checkbox__box" aria-hidden>
            <span className="p-checkbox__fill" />
            {/* Drawn, not an icon: pathLength 1 lets the stroke draw itself in when checked. */}
            <svg className="p-checkbox__mark" viewBox="0 0 16 16">
              <path pathLength={1} d={indeterminate ? 'M4.75 8h6.5' : 'M4.5 8.25l2.4 2.4 4.6-4.9'} />
            </svg>
          </span>
        </span>
        <span className={cx('p-choice__label', labelHidden && 'p-visually-hidden')}>
          {strike ? (
            <span className="p-choice__words">
              {label}
              <span className="p-choice__rule" aria-hidden />
            </span>
          ) : (
            label
          )}
        </span>
      </label>
      {helpText ? (
        <div className="p-choice__help" id={`${id}-help`}>
          {helpText}
        </div>
      ) : null}
      {error && typeof error !== 'boolean' ? <InlineError message={error} id={`${id}-error`} /> : null}
    </div>
  );
}
