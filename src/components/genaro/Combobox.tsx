'use client';

import * as React from 'react';
import { Icon } from './Icon';
import { isIconName } from './icons';
import { Labelled } from './Labelled';
import { Popover } from './Popover';
import { Spinner } from './Spinner';
import { Tag } from './Tag';
import { cx } from './utils';

export interface ComboboxOption {
  /** What `onChange` reports and `name` posts, such as a vehicle's id. Unique across the options. */
  value: string;
  /** Plain text: the row's main line, the field's text once picked, and what typing matches. */
  label: string;
  /** A second line under the label in `text-secondary`, such as a stock ID and status. */
  description?: React.ReactNode;
  /** Shown before the label, in the list and in the field once picked: an xs `Avatar`, say. */
  media?: React.ReactNode;
  /** Shown at the end of the row: a `Badge` or a short note such as "Inspection 3/8". */
  suffix?: React.ReactNode;
  /** More text that typing matches but the row doesn't show, such as a stock ID or a VIN. */
  keywords?: string[];
  /** Listed but can't be picked. */
  disabled?: boolean;
}

interface ComboboxBaseProps {
  /** Names the field and its list. Required, even when hidden. */
  label: string;
  /** The options to search. With remote search, the current results. */
  options: ComboboxOption[];
  /** Visually hides the label; screen readers still read it. */
  labelHidden?: boolean;
  /** Adds a red " *" to the label. It doesn't validate. */
  requiredIndicator?: boolean;
  /** Shown while the field is empty, such as "Search by reg or stock ID". */
  placeholder?: string;
  /** An icon name (`'SearchMinor'`) or any node, before the text. */
  prefix?: React.ReactNode;
  /** Guidance under the field. */
  helpText?: React.ReactNode;
  /** A string shows an InlineError; `true` only marks the field invalid. */
  error?: React.ReactNode | boolean;
  /** Shows the field but stops it changing. */
  disabled?: boolean;
  /**
   * Shows a clear (×) button while something is picked. With one choice, erasing the text and leaving the
   * field clears it too. Use it when "nothing picked" is a valid answer, such as "Unassigned" or "All makes".
   */
  clearable?: boolean;
  /** Shown in the list when nothing matches the search. Defaults to "No matches". */
  emptyState?: React.ReactNode;
  /** Called with the text as people type, and with `''` when the search resets. Fetch remote options here. */
  onQueryChange?: (query: string) => void;
  /** Shows a spinner in the list instead of the options, while remote options load. */
  loading?: boolean;
  /**
   * How typing narrows `options`. The default matches when every typed word is in the label or keywords,
   * ignoring case, or when the text without spaces and punctuation is, so "oy70tzg" finds "OY70 TZG".
   * `null` shows `options` as given, for results a server has already filtered.
   */
  filter?: ((option: ComboboxOption, query: string) => boolean) | null;
  /** Form field name: posts the picked value (one hidden input per value with `allowMultiple`). */
  name?: string;
  /** DOM id of the text input; generated when omitted. */
  id?: string;
}

export interface ComboboxSingleProps extends ComboboxBaseProps {
  /** Pick one option (the default). */
  allowMultiple?: false;
  /** Controlled value: the picked option's `value`, or `''` for none. */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  /** Called with the picked option's `value`, or `''` when cleared. */
  onChange?: (value: string, id: string) => void;
}

export interface ComboboxMultipleProps extends ComboboxBaseProps {
  /** Pick several options: they show as tags in the field, and the list stays open between picks. */
  allowMultiple: true;
  /** Controlled value: the picked options' values, in the order they were picked. */
  value?: string[];
  /** Initial value when uncontrolled. */
  defaultValue?: string[];
  /** Called with every picked value after each pick or removal. */
  onChange?: (value: string[], id: string) => void;
}

export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps;

/** Height of one option row plus the list's padding, for deciding whether the list opens above. */
const ROW = 32;
const LIST_PAD = 12;
const MAX_LIST = 320;

const toList = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The default filter: every typed word in the label or keywords, or the squashed text ("oy70tzg"). */
function matches(option: ComboboxOption, query: string): boolean {
  const haystack = [option.label, ...(option.keywords || [])].join(' ').toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.every((w) => haystack.includes(w))) return true;
  const q = squash(query);
  return q !== '' && squash(haystack).includes(q);
}

/**
 * A text field that searches a list of options as people type: the "editable combobox" pattern. Focus
 * stays in the field while ↓/↑ and Page Up/Down move through the matches, Enter picks, Escape closes.
 * Picks one option, or several with `allowMultiple`; searches `options` itself, or a server through
 * `onQueryChange` + `loading`. For a short fixed list, use Select.
 * @import import { Combobox } from "@/components/genaro";
 */
export function Combobox(props: ComboboxProps) {
  const {
    label, options, labelHidden, requiredIndicator, placeholder, prefix, helpText, error, disabled, clearable,
    emptyState, onQueryChange, loading, filter, name,
  } = props;
  const multiple = props.allowMultiple === true;
  const autoId = React.useId();
  const id = props.id || autoId;
  const listId = `${id}-listbox`;
  const optId = (i: number) => `${id}-option-${i}`;

  const [inner, setInner] = React.useState<string[]>(() => toList(props.value ?? props.defaultValue));
  const selected = props.value != null ? toList(props.value) : inner;
  // Options picked earlier, so their labels still show when a remote search no longer returns them.
  const [picked, setPicked] = React.useState<Record<string, ComboboxOption>>({});
  const find = (v: string) => options.find((o) => o.value === v) || picked[v];
  const current = !multiple && selected.length ? find(selected[0]) : undefined;

  const [open, setOpen] = React.useState(false);
  const [above, setAbove] = React.useState(false);
  /** What the person has typed since the list opened; null while the field shows the picked value. */
  const [query, setQuery] = React.useState<string | null>(null);
  const [activeValue, setActiveValue] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  /** Keeps the select-all from focusing with the pointer; the click's mouseup would undo it. */
  const keepSelection = React.useRef(false);

  const typed = (query ?? '').trim();
  const visible = typed && filter !== null ? options.filter((o) => (filter || matches)(o, typed)) : options;
  const usable = (i: number) => i >= 0 && i < visible.length && !visible[i].disabled;
  const step = (from: number, dir: 1 | -1, by = 1) => {
    let found = from;
    for (let i = from + dir, left = by; i >= 0 && i < visible.length; i += dir) {
      if (!usable(i)) continue;
      found = i;
      if (--left === 0) break;
    }
    return found;
  };
  const first = () => step(-1, 1);
  const last = () => step(visible.length, -1);
  let active = activeValue == null ? -1 : visible.findIndex((o) => o.value === activeValue);
  // While searching, the top match is highlighted, so typing then Enter picks it.
  if (open && !loading && active < 0 && typed) active = first();

  const text = query ?? (multiple ? '' : current ? current.label : selected[0] || '');

  function commit(next: string[]) {
    setInner(next);
    if (props.allowMultiple === true) props.onChange?.(next, id);
    else props.onChange?.(next[0] ?? '', id);
  }
  function search(next: string | null) {
    setQuery(next);
    if ((next ?? '') !== (query ?? '')) onQueryChange?.(next ?? '');
  }
  function place() {
    const r = inputRef.current?.parentElement?.getBoundingClientRect();
    if (!r) return;
    const want = Math.min(MAX_LIST, Math.max(options.length, 1) * ROW + LIST_PAD);
    const below = window.innerHeight - r.bottom;
    setAbove(below < want && r.top > below);
  }
  function show(highlight?: 'first' | 'last') {
    if (disabled || open) return;
    place();
    const at = visible.findIndex((o) => o.value === selected[selected.length - 1]);
    const start = usable(at) ? at : highlight === 'first' ? first() : highlight === 'last' ? last() : -1;
    setActiveValue(start >= 0 ? visible[start].value : null);
    setOpen(true);
  }
  /** Closes the list. `leave` is a blur, Tab or outside click: erased text then clears a clearable field. */
  function close(leave: boolean) {
    setOpen(false);
    if (leave && !multiple && clearable && query === '' && selected.length) commit([]);
    search(null);
  }
  function move(i: number) {
    if (i >= 0) setActiveValue(visible[i].value);
  }
  function pick(i: number) {
    if (!usable(i)) return;
    const o = visible[i];
    if (!picked[o.value]) setPicked((p) => ({ ...p, [o.value]: o }));
    if (multiple) {
      commit(selected.includes(o.value) ? selected.filter((v) => v !== o.value) : [...selected, o.value]);
      setActiveValue(o.value);
      search(null);
      return;
    }
    setOpen(false);
    search(null);
    if (selected[0] !== o.value) commit([o.value]);
  }
  function remove(v: string) {
    commit(selected.filter((x) => x !== v));
    inputRef.current?.focus();
  }
  function clear() {
    commit([]);
    search(null);
    setActiveValue(null);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    keepSelection.current = false;
    const k = e.key;
    if (k === 'Backspace' && multiple && text === '' && selected.length) {
      commit(selected.slice(0, -1));
      return;
    }
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        show(k === 'ArrowDown' ? 'first' : 'last');
      }
      return;
    }
    switch (k) {
      case 'ArrowDown':
        e.preventDefault();
        move(active < 0 ? first() : step(active, 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        move(active < 0 ? last() : step(active, -1));
        return;
      case 'PageDown':
        e.preventDefault();
        move(step(active, 1, 10));
        return;
      case 'PageUp':
        e.preventDefault();
        move(step(active < 0 ? visible.length : active, -1, 10));
        return;
      case 'Enter':
        // Never submits the form while the list is open.
        e.preventDefault();
        if (active >= 0) pick(active);
        else close(false);
        return;
      case 'Escape':
        // Only the list closes, not a modal or sheet the field sits in.
        e.preventDefault();
        e.stopPropagation();
        close(false);
        return;
    }
  }

  // Keep the highlighted option in view as the keys move it.
  React.useLayoutEffect(() => {
    if (!open || active < 0) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    const panel = el?.closest<HTMLElement>('.p-popover__panel');
    if (!el || !panel) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < panel.scrollTop + LIST_PAD / 2) panel.scrollTop = Math.max(0, top - LIST_PAD / 2);
    else if (bottom > panel.scrollTop + panel.clientHeight - LIST_PAD / 2) panel.scrollTop = bottom - panel.clientHeight + LIST_PAD / 2;
  }, [open, active]);

  const describedBy = error && typeof error !== 'boolean' ? `${id}-error` : helpText ? `${id}-help` : undefined;
  const showClear = clearable && !disabled && selected.length > 0;
  const status = !open || loading
    ? ''
    : visible.length
      ? `${visible.length} ${visible.length === 1 ? 'option' : 'options'}`
      : typeof emptyState === 'string'
        ? emptyState
        : 'No matches';

  return (
    <Labelled id={id} label={label} labelHidden={labelHidden} requiredIndicator={requiredIndicator} error={error} helpText={helpText}>
      <Popover
        className="p-combobox-popover"
        fullWidth
        active={open}
        onClose={() => close(true)}
        preferredPosition={above ? 'above' : 'below'}
        activator={
          <div
            className={cx(
              'p-field',
              'p-combobox',
              multiple && 'p-combobox--multiple',
              !!error && 'p-field--error',
              disabled && 'p-field--disabled',
            )}
            // A click on the field's padding or a tag goes to the text input.
            onMouseDown={(e) => {
              const t = e.target as HTMLElement;
              if (disabled || t === inputRef.current || t.closest('button')) return;
              e.preventDefault();
              inputRef.current?.focus();
              show();
            }}
          >
            {name && multiple ? selected.map((v) => <input key={v} type="hidden" name={name} value={v} />) : null}
            {name && !multiple ? <input type="hidden" name={name} value={selected[0] ?? ''} /> : null}
            {prefix ? <span className="p-field__affix">{isIconName(prefix) ? <Icon source={prefix} /> : prefix}</span> : null}
            {multiple
              ? selected.map((v) => (
                  <Tag key={v} disabled={disabled} onRemove={disabled ? undefined : () => remove(v)}>
                    {find(v)?.label ?? v}
                  </Tag>
                ))
              : null}
            {current?.media && query === null ? <span className="p-select__media">{current.media}</span> : null}
            <input
              ref={inputRef}
              id={id}
              type="text"
              role="combobox"
              className="p-field__input"
              value={text}
              placeholder={multiple && selected.length ? undefined : placeholder}
              disabled={disabled}
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-activedescendant={open && active >= 0 ? optId(active) : undefined}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              onChange={(e) => {
                search(e.target.value);
                setActiveValue(null);
                if (!open) {
                  place();
                  setOpen(true);
                }
              }}
              onKeyDown={onKeyDown}
              onClick={() => show()}
              onFocus={(e) => {
                // With one option picked, typing replaces its label rather than adding to it.
                if (multiple || !selected.length || query !== null) return;
                e.currentTarget.select();
                keepSelection.current = true;
              }}
              onMouseUp={(e) => {
                if (keepSelection.current) e.preventDefault();
                keepSelection.current = false;
              }}
              onBlur={() => {
                keepSelection.current = false;
                if (open || query !== null) close(true);
              }}
            />
            {showClear ? (
              <button
                type="button"
                className="p-field__clear"
                aria-label="Clear"
                onMouseDown={(e) => e.preventDefault()}
                onClick={clear}
              >
                <Icon source="CircleCancelMinor" />
              </button>
            ) : (
              <button
                type="button"
                className="p-combobox__toggle"
                tabIndex={-1}
                aria-label={open ? 'Hide options' : 'Show options'}
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (open) close(true);
                  else {
                    inputRef.current?.focus();
                    show();
                  }
                }}
              >
                <Icon source="SelectMinor" />
              </button>
            )}
          </div>
        }
      >
        {/* Clicking an option or the list must not move focus off the field. */}
        <div onMouseDown={(e) => e.preventDefault()}>
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            aria-multiselectable={multiple || undefined}
            aria-busy={loading || undefined}
            className="p-optionlist p-combobox__list"
          >
            {loading
              ? null
              : visible.map((o, i) => {
                  const on = selected.includes(o.value);
                  return (
                    <div
                      key={o.value}
                      id={optId(i)}
                      role="option"
                      aria-selected={on}
                      aria-disabled={o.disabled || undefined}
                      className={cx(
                        'p-optionlist__item',
                        'p-combobox__option',
                        on && !multiple && 'p-optionlist__item--selected',
                        i === active && 'p-optionlist__item--active',
                        o.disabled && 'p-optionlist__item--disabled',
                      )}
                      onMouseMove={() => {
                        if (i !== active && usable(i)) setActiveValue(o.value);
                      }}
                      onClick={() => pick(i)}
                    >
                      {multiple ? (
                        <span className={cx('p-combobox__box', on && 'p-combobox__box--on')} aria-hidden>
                          <Icon source="TickSmallMinor" />
                        </span>
                      ) : null}
                      {o.media ? <span className="p-select__media">{o.media}</span> : null}
                      <span className="p-combobox__text">
                        <span className="p-combobox__label">{o.label}</span>
                        {o.description ? <span className="p-combobox__description">{o.description}</span> : null}
                      </span>
                      {o.suffix ? <span className="p-combobox__suffix">{o.suffix}</span> : null}
                      {on && !multiple ? <Icon source="TickMinor" /> : null}
                    </div>
                  );
                })}
          </div>
          {loading ? (
            <div className="p-combobox__status">
              <Spinner size="small" accessibilityLabel="Loading options" />
            </div>
          ) : visible.length === 0 ? (
            <div className="p-combobox__status">{emptyState ?? 'No matches'}</div>
          ) : null}
        </div>
      </Popover>
      <span className="p-visually-hidden" role="status">
        {status}
      </span>
    </Labelled>
  );
}
