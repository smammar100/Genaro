'use client';

import * as React from 'react';
import { cx } from './utils';

export interface RadioButtonProps {
  label: React.ReactNode;
  name?: string;
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean, id: string) => void;
  helpText?: React.ReactNode;
  disabled?: boolean;
  labelHidden?: boolean;
  magic?: boolean;
  id?: string;
}

/** One choice in a group; group radios with the same `name` (or use ChoiceList). */
export function RadioButton(props: RadioButtonProps) {
  const { label, name, value, checked, defaultChecked, helpText, disabled, labelHidden, magic } = props;
  const autoId = React.useId();
  const id = props.id || autoId;
  return (
    <div className={cx('p-choice', magic && 'p-choice--magic', disabled && 'p-choice--disabled')}>
      <label className="p-choice__row" htmlFor={id}>
        <span className="p-choice__control">
          <input
            id={id}
            type="radio"
            name={name}
            value={value}
            className="p-radio__input"
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            onChange={(e) => props.onChange?.(e.target.checked, id)}
          />
          <span className="p-radio__ring" aria-hidden />
        </span>
        <span className={cx('p-choice__label', labelHidden && 'p-visually-hidden')}>{label}</span>
      </label>
      {helpText ? <div className="p-choice__help">{helpText}</div> : null}
    </div>
  );
}
