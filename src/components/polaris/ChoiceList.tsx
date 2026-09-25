'use client';

import * as React from 'react';
import { Checkbox } from './Checkbox';
import { InlineError } from './InlineError';
import { RadioButton } from './RadioButton';
import { cx } from './utils';

export interface Choice {
  label: React.ReactNode;
  value: string;
  helpText?: React.ReactNode;
  disabled?: boolean;
}

export interface ChoiceListProps {
  title: React.ReactNode;
  choices: Choice[];
  /** Controlled selection (values). */
  selected?: string[];
  /** Initial selection when uncontrolled. */
  defaultSelected?: string[];
  onChange?: (selected: string[], name?: string) => void;
  /** Checkboxes instead of radios. */
  allowMultiple?: boolean;
  titleHidden?: boolean;
  error?: React.ReactNode;
  name?: string;
  disabled?: boolean;
  className?: string;
}

/** A titled group of radios (one choice) or checkboxes (many). */
export function ChoiceList({ title, choices, selected, defaultSelected, onChange, allowMultiple, titleHidden, error, name, disabled, className }: ChoiceListProps) {
  const [inner, setInner] = React.useState<string[]>(selected || defaultSelected || []);
  const sel = selected || inner;
  const autoName = React.useId();
  const groupName = name || autoName;
  function toggle(value: string, on: boolean) {
    const next = allowMultiple ? (on ? sel.concat([value]) : sel.filter((x) => x !== value)) : [value];
    setInner(next);
    onChange?.(next, name);
  }
  return (
    <fieldset className={cx('p-choicelist', className)}>
      <legend className={cx('p-choicelist__title', titleHidden && 'p-visually-hidden')}>{title}</legend>
      <ul className="p-choicelist__choices">
        {(choices || []).map((c) => {
          const on = sel.includes(c.value);
          return (
            <li key={c.value}>
              {allowMultiple ? (
                <Checkbox label={c.label} helpText={c.helpText} checked={on} name={groupName} value={c.value} disabled={disabled || c.disabled} onChange={(v) => toggle(c.value, v)} />
              ) : (
                <RadioButton label={c.label} helpText={c.helpText} name={groupName} value={c.value} checked={on} disabled={disabled || c.disabled} onChange={() => toggle(c.value, true)} />
              )}
            </li>
          );
        })}
      </ul>
      {error ? <InlineError message={error} /> : null}
    </fieldset>
  );
}
