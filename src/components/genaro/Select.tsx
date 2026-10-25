'use client';

import * as React from 'react';
import { Icon } from './Icon';
import { Labelled } from './Labelled';
import { Popover } from './Popover';
import { cx } from './utils';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  /** Shown before the label, in the list and in the field once chosen — e.g. an xs Avatar. */
  media?: React.ReactNode;
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
  autoFocus?: boolean;
  /** Opens the list as soon as the field mounts (an in-place editor, say). */
  defaultOpen?: boolean;
  onBlur?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

/** Height of one option row plus the list's padding, for deciding whether the list opens above. */
const ROW = 32;
const LIST_PAD = 12;
const MAX_LIST = 320;

/**
 * A Genaro field that opens a Genaro option list: no browser-drawn menu. It follows the
 * "select-only combobox" pattern — focus stays on the field while the arrow keys, Home/End,
 * Page Up/Down and typed letters move through the options, Enter or Space picks, Escape closes.
 * @import import { Select } from "@/components/genaro";
 */
export function Select(props: SelectProps) {
  const { label, labelInline: inline, labelHidden, placeholder, helpText, error, disabled, name, magic } = props;
  const autoId = React.useId();
  const id = props.id || autoId;
  const listId = `${id}-listbox`;
  const optId = (i: number) => `${id}-option-${i}`;
  const opts: SelectOption[] = (props.options || []).map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
  const [inner, setInner] = React.useState<string>(
    props.value != null ? props.value : props.defaultValue != null ? props.defaultValue : opts[0] ? opts[0].value : '',
  );
  const value = props.value != null ? props.value : inner;
  const selectedIndex = opts.findIndex((o) => o.value === value);
  const current = opts[selectedIndex];

  const [open, setOpen] = React.useState(false);
  const [above, setAbove] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const typed = React.useRef({ text: '', at: 0 });

  const usable = (i: number) => i >= 0 && i < opts.length && !opts[i].disabled;
  const next = (from: number, dir: 1 | -1, by = 1) => {
    let found = from;
    for (let i = from + dir, left = by; i >= 0 && i < opts.length; i += dir) {
      if (!usable(i)) continue;
      found = i;
      if (--left === 0) break;
    }
    return found;
  };
  const first = () => next(-1, 1);
  const last = () => next(opts.length, -1);

  function show(at?: number) {
    if (disabled || opts.length === 0) return;
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) {
      const want = Math.min(MAX_LIST, opts.length * ROW + LIST_PAD);
      const below = window.innerHeight - r.bottom;
      setAbove(below < want && r.top > below);
    }
    setActive(at != null && usable(at) ? at : usable(selectedIndex) ? selectedIndex : first());
    setOpen(true);
  }
  function hide() {
    setOpen(false);
  }
  function choose(i: number) {
    if (!usable(i)) return;
    hide();
    triggerRef.current?.focus();
    const picked = opts[i].value;
    if (picked === value) return;
    setInner(picked);
    props.onChange?.(picked, id);
  }

  /** Type-ahead: letters typed within half a second build a prefix to jump to. */
  function match(key: string, from: number) {
    const now = Date.now();
    const text = now - typed.current.at < 500 ? typed.current.text + key.toLowerCase() : key.toLowerCase();
    typed.current = { text, at: now };
    // A repeated single letter cycles through the options starting with it.
    const cycling = text.length > 1 && text.split('').every((c) => c === text[0]);
    const needle = cycling ? text[0] : text;
    const start = cycling || text.length === 1 ? from + 1 : from;
    for (let n = 0; n < opts.length; n++) {
      const i = (start + n) % opts.length;
      if (usable(i) && opts[i].label.toLowerCase().startsWith(needle)) return i;
    }
    return -1;
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    props.onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const k = e.key;
    const printable = k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    const typing = Date.now() - typed.current.at < 500 && typed.current.text !== '';
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || (k === ' ' && !typing)) {
        e.preventDefault();
        show(k === 'ArrowUp' && !usable(selectedIndex) ? last() : undefined);
      } else if (printable) {
        e.preventDefault();
        const i = match(k, selectedIndex);
        if (i >= 0) show(i);
      }
      return;
    }
    switch (k) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => next(a, 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => next(a, -1));
        return;
      case 'PageDown':
        e.preventDefault();
        setActive((a) => next(a, 1, 10));
        return;
      case 'PageUp':
        e.preventDefault();
        setActive((a) => next(a, -1, 10));
        return;
      case 'Home':
        e.preventDefault();
        setActive(first());
        return;
      case 'End':
        e.preventDefault();
        setActive(last());
        return;
      case 'Enter':
        e.preventDefault();
        choose(active);
        return;
      case 'Escape':
        // Only the list closes, not a modal or sheet the field sits in.
        e.preventDefault();
        e.stopPropagation();
        hide();
        return;
      case 'Tab':
        hide();
        return;
      default:
        if (k === ' ' && !typing) {
          e.preventDefault();
          choose(active);
        } else if (printable) {
          e.preventDefault();
          const i = match(k, active);
          if (i >= 0) setActive(i);
        }
    }
  }

  // Keep the highlighted option in view as the keys move it.
  React.useLayoutEffect(() => {
    if (!open || active < 0) return;
    const list = listRef.current;
    const panel = list?.parentElement;
    const el = list?.children[active] as HTMLElement | undefined;
    if (!panel || !el) return;
    const top = el.offsetTop - list.offsetTop;
    const bottom = top + el.offsetHeight + LIST_PAD;
    if (top < panel.scrollTop) panel.scrollTop = Math.max(0, top - LIST_PAD / 2);
    else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight;
  }, [open, active]);

  React.useEffect(() => {
    if (props.defaultOpen) show();
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const describedBy = error && typeof error !== 'boolean' ? `${id}-error` : helpText ? `${id}-help` : undefined;

  return (
    <Labelled id={id} label={inline ? null : label} labelHidden={labelHidden} error={error} helpText={helpText}>
      <Popover
        className="p-select-popover"
        fullWidth
        active={open}
        onClose={hide}
        preferredPosition={above ? 'above' : 'below'}
        activator={
          <div
            className={cx(
              'p-select',
              magic && 'p-select--magic',
              !!error && 'p-select--error',
              disabled && 'p-select--disabled',
              open && 'p-select--open',
            )}
          >
            {name ? <input type="hidden" name={name} value={value} /> : null}
            <button
              ref={triggerRef}
              type="button"
              id={id}
              className="p-select__trigger"
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-activedescendant={open && active >= 0 ? optId(active) : undefined}
              aria-label={inline ? label : undefined}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              disabled={disabled}
              onClick={() => (open ? hide() : show())}
              autoFocus={props.autoFocus}
              onKeyDown={onKeyDown}
              // Space is handled on keydown; Firefox would also click on keyup
              // and close the list it just opened.
              onKeyUp={(e) => {
                if (e.key === ' ') e.preventDefault();
              }}
              onBlur={() => {
                hide();
                props.onBlur?.();
              }}
            >
              {inline ? <span className="p-select__inline-label">{label}</span> : null}
              {current?.media ? <span className="p-select__media">{current.media}</span> : null}
              <span className={cx('p-select__value', !current && 'p-select__value--placeholder')}>
                {current ? current.label : placeholder || ''}
              </span>
              <Icon source="SelectMinor" />
            </button>
          </div>
        }
      >
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className="p-optionlist p-select__list"
          // Clicking an option or the scrollbar must not move focus off the field.
          onMouseDown={(e) => e.preventDefault()}
        >
          {opts.map((o, i) => {
            const on = o.value === value;
            return (
              <div
                key={o.value}
                id={optId(i)}
                role="option"
                aria-selected={on}
                aria-disabled={o.disabled || undefined}
                className={cx(
                  'p-optionlist__item',
                  on && 'p-optionlist__item--selected',
                  i === active && 'p-optionlist__item--active',
                  o.disabled && 'p-optionlist__item--disabled',
                )}
                onMouseMove={() => {
                  if (i !== active && usable(i)) setActive(i);
                }}
                onClick={() => choose(i)}
              >
                <span className="p-select__option">
                  {o.media ? <span className="p-select__media">{o.media}</span> : null}
                  <span>{o.label}</span>
                </span>
                {on ? <Icon source="TickMinor" /> : null}
              </div>
            );
          })}
        </div>
      </Popover>
    </Labelled>
  );
}
