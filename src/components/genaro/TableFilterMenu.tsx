'use client';

import * as React from 'react';
import { Button } from './Button';
import { Combobox } from './Combobox';
import { Popover } from './Popover';
import { Select } from './Select';
import { TextField } from './TextField';
import { cx } from './utils';
import {
  TABLE_FILTER_OPERATORS,
  TABLE_JOINS,
  defaultTableRule,
  withTableOperator,
  type TableFilterField,
  type TableFilterOperator,
  type TableFilterRule,
  type TableJoin,
} from './tableRules';

export interface TableFilterMenuProps {
  /** The columns a rule can read, each with its variant (and a select field's options). */
  fields: TableFilterField[];
  rules: TableFilterRule[];
  /** How the rules combine: every one ("and") or any one ("or"). */
  join: TableJoin;
  /** Called with the whole list after every edit, however small. */
  onChange: (rules: TableFilterRule[], join: TableJoin) => void;
  /** Ctrl/⌘ + Shift + F opens and closes it (default on). */
  shortcut?: boolean;
  /** Which edge of the button the panel lines up with. */
  preferredAlignment?: 'left' | 'right';
}

/** Typing in a field or list must not toggle the panel. */
function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

/** Ctrl/⌘ + Shift + key toggles a panel, outside text fields. */
export function useTableMenuShortcut(key: string, enabled: boolean, toggle: () => void) {
  const latest = React.useRef(toggle);
  React.useEffect(() => {
    latest.current = toggle;
  });
  React.useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (isEditable(e.target) || !e.shiftKey || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== key) return;
      e.preventDefault();
      latest.current();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, key]);
}

function RuleValue({ field, rule, onValue }: { field: TableFilterField; rule: TableFilterRule; onValue: (value: string | string[]) => void }) {
  const name = `${field.label} value`;
  if (rule.operator === 'empty' || rule.operator === 'notEmpty') return null;

  if (field.variant === 'select') {
    return (
      <Combobox
        label={name}
        labelHidden
        allowMultiple
        placeholder={field.placeholder ?? 'Pick values'}
        options={(field.options ?? []).map((o) => ({
          value: o.value,
          label: o.label,
          suffix: o.count != null ? <span className="tabular-nums text-(--text-secondary)">{o.count}</span> : undefined,
        }))}
        value={Array.isArray(rule.value) ? rule.value : []}
        onChange={(value) => onValue(value)}
        emptyState="Nothing has that value."
      />
    );
  }

  if (field.variant === 'boolean') {
    return (
      <Select
        label={name}
        labelHidden
        options={[
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]}
        value={String(rule.value)}
        onChange={(value) => onValue(value)}
      />
    );
  }

  const type = field.variant === 'number' ? 'number' : field.variant === 'date' ? 'date' : 'text';
  if (rule.operator === 'between') {
    const [from, to] = Array.isArray(rule.value) ? rule.value : ['', ''];
    return (
      <>
        <TextField label={`${field.label} from`} labelHidden type={type} value={from} placeholder="From" autoComplete="off" onChange={(v) => onValue([v, to])} />
        <span className="p-tablemenu__and">and</span>
        <TextField label={`${field.label} to`} labelHidden type={type} value={to} placeholder="To" autoComplete="off" onChange={(v) => onValue([from, v])} />
      </>
    );
  }
  return (
    <TextField
      label={name}
      labelHidden
      type={type}
      inputMode={type === 'number' ? 'decimal' : undefined}
      value={typeof rule.value === 'string' ? rule.value : ''}
      placeholder={field.placeholder ?? 'Enter a value'}
      autoComplete="off"
      onChange={(value) => onValue(value)}
    />
  );
}

/**
 * A Filter button with the number of rules, opening the list of them: "Where
 * Make contains Ford, and Mileage is at least 50000". Each rule picks a column,
 * a condition that suits the column's variant and a value; the second row
 * switches every join between "and" and "or". Add filter starts a rule on the
 * first column; Reset filters clears them. Ctrl/⌘ + Shift + F opens it, and
 * Backspace on the button removes the last rule. A rule still waiting for its
 * value narrows nothing. After tablecn's advanced filter menu.
 * @import import { TableFilterMenu } from "@/components/genaro";
 */
export function TableFilterMenu({ fields, rules, join, onChange, shortcut = true, preferredAlignment }: TableFilterMenuProps) {
  const [open, setOpen] = React.useState(false);
  const titleId = React.useId();
  const baseId = React.useId();
  /** A rule just added, whose column picker takes focus once it renders. */
  const focusRule = React.useRef<string | null>(null);
  useTableMenuShortcut('f', shortcut, () => setOpen((o) => !o));

  const byId = React.useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
  const fieldOptions = React.useMemo(() => fields.map((f) => ({ value: f.id, label: f.label })), [fields]);

  // A new rule's column picker takes focus, so the person goes on typing.
  React.useEffect(() => {
    if (!focusRule.current) return;
    document.getElementById(`${baseId}-${focusRule.current}-field`)?.focus();
    focusRule.current = null;
  });

  const update = (id: string, next: (rule: TableFilterRule) => TableFilterRule) =>
    onChange(
      rules.map((r) => (r.id === id ? next(r) : r)),
      join,
    );

  function add() {
    const field = fields[0];
    if (!field) return;
    const rule = defaultTableRule(field);
    onChange([...rules, rule], join);
    focusRule.current = rule.id;
  }

  const count = rules.length;
  return (
    <span
      onKeyDown={(e) => {
        // Backspace on the button takes the last rule off, as in tablecn.
        if ((e.key === 'Backspace' || e.key === 'Delete') && !open && count > 0 && (e.target as HTMLElement).tagName === 'BUTTON') {
          e.preventDefault();
          onChange(rules.slice(0, -1), join);
        }
      }}
    >
      <Popover
        active={open}
        onClose={() => setOpen(false)}
        preferredAlignment={preferredAlignment}
        activator={
          <Button variant="tertiary" icon="FilterMinor" pressed={count > 0} ariaExpanded={open} onClick={() => setOpen((o) => !o)} title="Filter (Ctrl+Shift+F)">
            Filter
            {count > 0 ? <span className="p-tablemenu__count">{count}</span> : null}
          </Button>
        }
      >
        <div className={cx('p-tablemenu', count === 0 && 'p-tablemenu--empty')} role="group" aria-labelledby={titleId}>
          <div className="p-tablemenu__head">
            <h2 id={titleId} className="p-tablemenu__title">
              {count ? 'Filters' : 'No filters applied'}
            </h2>
            {count ? null : <p className="p-tablemenu__hint">Add filters to narrow the rows.</p>}
          </div>
          {count > 0 ? (
            <ul className="p-tablemenu__rows">
              {rules.map((rule, i) => {
                const field = byId.get(rule.field) ?? fields[0];
                if (!field) return null;
                const ops = TABLE_FILTER_OPERATORS[field.variant];
                return (
                  <li key={rule.id} className="p-tablemenu__row">
                    <div className="p-tablemenu__join">
                      {i === 0 ? (
                        'Where'
                      ) : i === 1 ? (
                        <Select
                          label="Join rules with"
                          labelHidden
                          options={TABLE_JOINS}
                          value={join}
                          onChange={(value) => onChange(rules, value as TableJoin)}
                        />
                      ) : (
                        join
                      )}
                    </div>
                    <div className="p-tablemenu__field">
                      <Combobox
                        id={`${baseId}-${rule.id}-field`}
                        label="Column"
                        labelHidden
                        placeholder="Search columns"
                        options={fieldOptions}
                        value={field.id}
                        onChange={(id) => {
                          const next = byId.get(id);
                          if (next && next.id !== rule.field) update(rule.id, () => defaultTableRule(next, rule.id));
                        }}
                        emptyState="No column by that name."
                      />
                    </div>
                    <div className="p-tablemenu__op">
                      <Select
                        label="Condition"
                        labelHidden
                        options={ops}
                        value={rule.operator}
                        onChange={(op) => update(rule.id, (r) => withTableOperator(r, field.variant, op as TableFilterOperator))}
                      />
                    </div>
                    <div className="p-tablemenu__value">
                      <RuleValue field={field} rule={rule} onValue={(value) => update(rule.id, (r) => ({ ...r, value }))} />
                    </div>
                    <span className="p-tablemenu__remove">
                      <Button
                        variant="tertiary"
                        icon="DeleteMinor"
                        accessibilityLabel={`Remove the ${field.label} filter`}
                        onClick={() => onChange(rules.filter((r) => r.id !== rule.id), join)}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className="p-tablemenu__foot">
            <Button icon="PlusMinor" onClick={add} disabled={fields.length === 0}>
              Add filter
            </Button>
            {count > 0 ? (
              <Button variant="tertiary" onClick={() => onChange([], 'and')}>
                Reset filters
              </Button>
            ) : null}
          </div>
        </div>
      </Popover>
    </span>
  );
}
