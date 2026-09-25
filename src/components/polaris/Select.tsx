'use client';

import * as React from 'react';
import { Icon } from './Icon';
import { Labelled } from './Labelled';
import { cx } from './utils';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  label: string;
  options: Array<string | SelectOption>;
  /** Controlled value. */
  value?: string;
  /** Initial value when uncontrolled; defaults to the first option. */
  defaultValue?: string;
  onChange?: (value: string, id: string) => void;
  /** Shows the label inside the control ("Sort by Newest"). */
  labelInline?: boolean;
  labelHidden?: boolean;
  placeholder?: string;
  helpText?: React.ReactNode;
  error?: React.ReactNode | boolean;
  disabled?: boolean;
  name?: string;
  magic?: boolean;
  id?: string;
}

/** Native select styled as a Polaris field. */
export function Select(props: SelectProps) {
  const { label, labelInline: inline, labelHidden, placeholder, helpText, error, disabled, name, magic } = props;
  const autoId = React.useId();
  const id = props.id || autoId;
  const opts = (props.options || []).map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
  const [inner, setInner] = React.useState<string>(
    props.value != null ? props.value : props.defaultValue != null ? props.defaultValue : opts[0] ? opts[0].value : '',
  );
  const value = props.value != null ? props.value : inner;
  const current = opts.find((o) => o.value === value);

  return (
    <Labelled id={id} label={inline ? null : label} labelHidden={labelHidden} error={error} helpText={helpText}>
      <div className={cx('p-select', magic && 'p-select--magic', !!error && 'p-select--error', disabled && 'p-select--disabled')}>
        <select
          id={id}
          className="p-select__native"
          value={value}
          name={name}
          onChange={(e) => {
            setInner(e.target.value);
            props.onChange?.(e.target.value, id);
          }}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error && typeof error !== 'boolean' ? `${id}-error` : helpText ? `${id}-help` : undefined}
          aria-label={inline ? label : undefined}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {opts.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="p-select__content" aria-hidden>
          {inline ? <span className="p-select__inline-label">{label}</span> : null}
          <span className="p-select__value">{current ? current.label : placeholder || ''}</span>
          <Icon source="SelectMinor" />
        </div>
      </div>
    </Labelled>
  );
}
