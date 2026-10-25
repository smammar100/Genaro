'use client';

import * as React from 'react';
import { InlineError } from './InlineError';
import { cx } from './utils';

export interface SwitchProps {
  /** What the switch turns on, as a positive statement: "Publish to AutoTrader". Required, even when hidden. */
  label: React.ReactNode;
  /** Controlled state; pair with `onChange`. */
  checked?: boolean;
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean;
  /** Called with the new state as soon as the switch flips. */
  onChange?: (checked: boolean, id: string) => void;
  /** What turning it on does, under the label in `text-secondary`. */
  helpText?: React.ReactNode;
  /** A string shows an InlineError; `true` only marks the switch invalid. */
  error?: React.ReactNode | boolean;
  /** Shows the switch but stops it changing. Say why in `helpText`. */
  disabled?: boolean;
  /** Visually hides the label; screen readers still read it. For rows that name the switch already. */
  labelHidden?: boolean;
  /**
   * `'end'` (default): the switch, then its label. `'start'`: the label and help text first and the switch at
   * the far end of the row, for a settings row.
   */
  labelPosition?: 'end' | 'start';
  /** Form field name: the switch posts `value` while it's on, and nothing while it's off. */
  name?: string;
  /** Posted while on (the browser default is `"on"`). */
  value?: string;
  /** DOM id of the switch; generated when omitted. */
  id?: string;
}

/**
 * An on/off toggle for a setting that applies at once, such as publishing to a channel. Checked fill is
 * bg-fill-brand-selected. For an option saved with a form's submit button, use Checkbox.
 * @import import { Switch } from "@/components/genaro";
 */
export function Switch(props: SwitchProps) {
  const { label, helpText, error, disabled, labelHidden, labelPosition, name, value } = props;
  const autoId = React.useId();
  const id = props.id || autoId;
  const [inner, setInner] = React.useState(!!props.defaultChecked);
  const checked = props.checked != null ? props.checked : inner;
  const message = error && typeof error !== 'boolean' ? error : null;

  return (
    <div
      className={cx(
        'p-switch',
        labelPosition === 'start' && 'p-switch--start',
        disabled && 'p-switch--disabled',
        !!error && 'p-switch--error',
      )}
    >
      <span className="p-switch__control">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="p-switch__input"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={(e) => {
            setInner(e.target.checked);
            props.onChange?.(e.target.checked, id);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? `${id}-error` : helpText ? `${id}-help` : undefined}
        />
        <span className="p-switch__track" aria-hidden>
          <span className="p-switch__thumb" />
        </span>
      </span>
      <div className="p-switch__text">
        <label htmlFor={id} className={cx('p-switch__label', labelHidden && 'p-visually-hidden')}>
          {label}
        </label>
        {helpText ? (
          <div className="p-switch__help" id={`${id}-help`}>
            {helpText}
          </div>
        ) : null}
        {message ? <InlineError message={message} id={`${id}-error`} /> : null}
      </div>
    </div>
  );
}
