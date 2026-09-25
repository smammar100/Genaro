'use client';

import * as React from 'react';
import { Icon } from './Icon';
import { isIconName } from './icons';
import { Labelled } from './Labelled';
import type { Action } from './types';
import { cx } from './utils';

export interface TextFieldProps {
  label: React.ReactNode;
  /** Controlled value. Omit (or use defaultValue) to let the field manage its own state. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, id: string) => void;
  type?: 'text' | 'email' | 'number' | 'password' | 'search' | 'tel' | 'url';
  /** `true` for 3 rows, or a row count. */
  multiline?: boolean | number;
  placeholder?: string;
  /** An icon name (e.g. `'SearchMinor'`) or any node, e.g. "$". */
  prefix?: React.ReactNode;
  /** An icon name or any node, e.g. "kg". */
  suffix?: React.ReactNode;
  clearButton?: boolean;
  onClearButtonClick?: (id: string) => void;
  helpText?: React.ReactNode;
  /** A string shows an InlineError; `true` only marks the field invalid. */
  error?: React.ReactNode | boolean;
  disabled?: boolean;
  readOnly?: boolean;
  labelHidden?: boolean;
  labelAction?: Action;
  requiredIndicator?: boolean;
  step?: number;
  connectedLeft?: React.ReactNode;
  connectedRight?: React.ReactNode;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  /** Form field name — lets the value post with a <form> or Server Action. */
  name?: string;
  required?: boolean;
  maxLength?: number;
  /** Sidekick is writing into this field (purple halo + sweep). */
  magic?: boolean;
  id?: string;
}

/** Single- or multi-line text input with label, help text and validation. */
export function TextField(props: TextFieldProps) {
  const {
    label, type, multiline, placeholder, prefix, suffix, clearButton, onClearButtonClick, helpText, error, disabled,
    readOnly, labelHidden, labelAction, requiredIndicator, step, connectedLeft, connectedRight, autoComplete, inputMode,
    name, required, maxLength, magic,
  } = props;
  const autoId = React.useId();
  const id = props.id || autoId;
  const [inner, setInner] = React.useState<string>(props.value != null ? props.value : props.defaultValue || '');
  const value = props.value != null ? props.value : inner;

  function change(next: string) {
    setInner(next);
    props.onChange?.(next, id);
  }
  function stepBy(direction: 1 | -1) {
    const s = step || 1;
    const decimals = Math.max((String(s).split('.')[1] || '').length, (String(value).split('.')[1] || '').length);
    change(((parseFloat(value) || 0) + direction * s).toFixed(decimals));
  }

  const shared = {
    id,
    className: 'p-field__input',
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(e.target.value),
    placeholder,
    disabled,
    readOnly,
    name,
    required,
    maxLength,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error && typeof error !== 'boolean' ? `${id}-error` : helpText ? `${id}-help` : undefined,
    autoComplete: autoComplete || 'off',
  };
  const field = multiline ? (
    <textarea {...shared} rows={typeof multiline === 'number' ? multiline : 3} />
  ) : (
    <input {...shared} type={type || 'text'} inputMode={inputMode} />
  );

  const box = (
    <div
      className={cx('p-field', magic && 'p-field--magic', !!error && 'p-field--error', disabled && 'p-field--disabled', readOnly && 'p-field--readonly', !!multiline && 'p-field--multiline')}
    >
      {prefix ? <span className="p-field__affix">{isIconName(prefix) ? <Icon source={prefix} /> : prefix}</span> : null}
      {field}
      {suffix ? <span className="p-field__affix">{isIconName(suffix) ? <Icon source={suffix} /> : suffix}</span> : null}
      {clearButton && value ? (
        <button
          type="button"
          className="p-field__clear"
          aria-label="Clear"
          onClick={() => {
            setInner('');
            onClearButtonClick?.(id);
          }}
        >
          <Icon source="CircleCancelMinor" />
        </button>
      ) : null}
      {type === 'number' && !disabled && !readOnly ? (
        <span className="p-field__stepper">
          <button type="button" aria-label="Increase" tabIndex={-1} onClick={() => stepBy(1)}>
            <Icon source="ChevronUpMinor" />
          </button>
          <button type="button" aria-label="Decrease" tabIndex={-1} onClick={() => stepBy(-1)}>
            <Icon source="ChevronDownMinor" />
          </button>
        </span>
      ) : null}
    </div>
  );

  return (
    <Labelled id={id} label={label} labelHidden={labelHidden} labelAction={labelAction} error={error} helpText={helpText} requiredIndicator={requiredIndicator}>
      {connectedRight || connectedLeft ? (
        <div className="p-connected">
          {connectedLeft}
          {box}
          {connectedRight}
        </div>
      ) : (
        box
      )}
    </Labelled>
  );
}
