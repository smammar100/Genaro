'use client';

import * as React from 'react';
import { Checkbox } from './Checkbox';
import { Icon } from './Icon';
import { cx } from './utils';

export interface OptionDescriptor {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface OptionListProps {
  title?: string;
  options?: OptionDescriptor[];
  sections?: Array<{ title?: string; options: OptionDescriptor[] }>;
  /** Controlled selection. */
  selected?: string[];
  /** Initial selection when uncontrolled. */
  defaultSelected?: string[];
  onChange?: (selected: string[]) => void;
  allowMultiple?: boolean;
  className?: string;
}

/** A list of options to pick from (single with a tick, or multiple with checkboxes). */
export function OptionList({ title, options, sections, selected, defaultSelected, onChange, allowMultiple, className }: OptionListProps) {
  const [inner, setInner] = React.useState<string[]>(selected || defaultSelected || []);
  const sel = selected || inner;
  const list = sections || [{ title, options: options || [] }];
  return (
    <div className={cx('p-optionlist', className)} role="listbox" aria-multiselectable={allowMultiple || undefined}>
      {list.map((sec, si) => (
        <div key={si}>
          {sec.title ? <div className="p-optionlist__title">{sec.title}</div> : null}
          {(sec.options || []).map((o) => {
            const on = sel.includes(o.value);
            const pick = () => {
              const next = allowMultiple ? (on ? sel.filter((x) => x !== o.value) : sel.concat([o.value])) : [o.value];
              setInner(next);
              onChange?.(next);
            };
            if (allowMultiple) {
              return (
                <div key={o.value} className="p-optionlist__item p-optionlist__item--multi">
                  <Checkbox label={o.label} checked={on} disabled={o.disabled} onChange={pick} />
                </div>
              );
            }
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                disabled={o.disabled}
                className={cx('p-optionlist__item', on && 'p-optionlist__item--selected')}
                onClick={pick}
              >
                <span>{o.label}</span>
                {on ? <Icon source="TickMinor" /> : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
