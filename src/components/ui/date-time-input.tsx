"use client";

import * as React from "react";
import { Calendar, Clock } from "lucide-react";
import { DatePicker, Popover } from "@/components/polaris";
import { cn } from "@/lib/utils";
import { forwardBoxClick, inputBoxClassName, inputControlClassName } from "./input-styles";
import { watchValue, writeValue } from "./input-value";

/**
 * Date, time and date-time fields drawn by Polaris instead of the browser:
 * a text field you can type into (2026-09-25, 25/09/2026, 9:30, 930, 9pm…)
 * that opens Polaris's calendar or a list of times. `<Input type="date">`,
 * `type="time"` and `type="datetime-local"` render this, so every date field
 * in the app gets it.
 *
 * The value the rest of the app sees is exactly what the native input gave —
 * "YYYY-MM-DD", "HH:MM", "YYYY-MM-DDTHH:MM" — held in a hidden input that
 * carries the caller's name, value, onChange, onBlur and ref (so plain React
 * state and react-hook-form's register() both work unchanged). What the user
 * types lives in a draft, and only whole, valid values (or an empty field)
 * reach the caller, as with the native control.
 */

type DateTimeType = "date" | "time" | "datetime-local";

export function isDateTimeType(type: unknown): type is DateTimeType {
  return type === "date" || type === "time" || type === "datetime-local";
}

const pad = (n: number) => String(n).padStart(2, "0");

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromIsoDate(iso: string): Date | undefined {
  const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return r ? new Date(+r[1], +r[2] - 1, +r[3]) : undefined;
}

function isRealDate(y: number, m: number, d: number) {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** A two-digit year: up to ten years ahead is this century, the rest the last (98 -> 1998). */
function fullYear(yy: number) {
  return yy <= (new Date().getFullYear() % 100) + 10 ? 2000 + yy : 1900 + yy;
}

/** "2026-09-25", "25/09/2026", "25.9.26", "25092026" → "2026-09-25"; null unless it is a whole date. */
function parseDateText(text: string): string | null {
  const t = text.trim();
  let r: RegExpExecArray | null;
  let y: number;
  let m: number;
  let d: number;
  if ((r = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t))) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/.exec(t)))
    [d, m, y] = [+r[1], +r[2], r[3].length === 2 ? fullYear(+r[3]) : +r[3]];
  else if ((r = /^(\d{2})(\d{2})(\d{4})$/.exec(t))) [d, m, y] = [+r[1], +r[2], +r[3]];
  else return null;
  return y >= 1900 && y <= 2200 && isRealDate(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null;
}

/** "9:30", "0930", "930", "9.30", "9pm", "9:30 pm", "21:30:00" → "09:30" / "21:30"; null otherwise. */
function parseTimeText(text: string): string | null {
  const t = text.trim().toLowerCase().replace(/\s+/g, "");
  const r = /^(\d{1,2})(?:[:.]?(\d{2}))?(?::\d{2})?(am|pm|a|p)?$/.exec(t);
  if (!r) return null;
  let h = +r[1];
  const min = r[2] ? +r[2] : 0;
  const half = r[3];
  if (half) {
    if (h < 1 || h > 12) return null;
    if (half[0] === "p" && h !== 12) h += 12;
    if (half[0] === "a" && h === 12) h = 0;
  }
  return h <= 23 && min <= 59 ? `${pad(h)}:${pad(min)}` : null;
}

const datePartOf = (v: string) => (/^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : "");
const timePartOf = (v: string) => {
  const r = /(?:^|T)(\d{2}:\d{2})/.exec(v);
  return r ? r[1] : "";
};
const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

type Size = "sm" | "default" | "lg" | number;

type DateTimeInputProps = Omit<React.ComponentProps<"input">, "size" | "type"> & {
  type: DateTimeType;
  size?: Size;
  unstyled?: boolean;
};

export function DateTimeInput({
  type,
  className,
  size = "default",
  unstyled = false,
  style,
  id,
  placeholder,
  disabled,
  readOnly,
  required,
  min,
  max,
  step,
  autoFocus,
  onFocus,
  onKeyDown,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ref,
  ...owned
}: DateTimeInputProps) {
  const realRef = React.useRef<HTMLInputElement | null>(null);
  const unwatch = React.useRef<(() => void) | null>(null);
  const [current, setCurrent] = React.useState(() => String(owned.value ?? owned.defaultValue ?? ""));
  const seen = React.useRef(current);
  const sync = React.useCallback((v: string) => {
    if (v === seen.current) return;
    seen.current = v;
    setCurrent(v);
  }, []);

  const setRealRef = React.useCallback(
    (el: HTMLInputElement | null) => {
      unwatch.current?.();
      unwatch.current = null;
      realRef.current = el;
      // Watch before the caller's ref runs: react-hook-form writes the
      // registered value inside it.
      if (el) unwatch.current = watchValue(el, (v) => queueMicrotask(() => sync(v)));
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.RefObject<HTMLInputElement | null>).current = el;
    },
    [ref, sync],
  );

  // Belt and braces: a form's native reset() skips the value setter.
  React.useLayoutEffect(() => {
    if (realRef.current) sync(realRef.current.value);
  });

  const commit = React.useCallback(
    (v: string) => {
      const el = realRef.current;
      if (!el) return;
      writeValue(el, v);
      sync(el.value);
    },
    [sync],
  );
  const blurOwned = React.useCallback(() => {
    realRef.current?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  }, []);

  const shared = {
    size,
    unstyled,
    style,
    disabled,
    readOnly,
    required,
    autoFocus,
    onFocus,
    onKeyDown,
    describedBy,
    invalid,
    onLeave: blurOwned,
  };

  const hidden = (
    <input
      {...owned}
      ref={setRealRef}
      type="text"
      tabIndex={-1}
      aria-hidden
      autoComplete="off"
      disabled={disabled}
      className="sr-only"
      // Something focusing the field (react-hook-form on an error) lands on
      // the field you can see.
      onFocus={(e) => (e.currentTarget.parentElement?.querySelector("[data-slot='input']") as HTMLElement | null)?.focus()}
    />
  );

  if (type === "date" || type === "time") {
    const Part = type === "date" ? DatePart : TimePart;
    return (
      <Part
        {...shared}
        id={id}
        className={className}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
        labelledBy={labelledBy}
        min={min}
        max={max}
        step={step}
        value={type === "date" ? datePartOf(current) : timePartOf(current)}
        onCommit={commit}
      >
        {hidden}
      </Part>
    );
  }

  // Date and time side by side. Picking a date with no time yet uses 09:00;
  // a time with no date yet uses today.
  const day = datePartOf(current);
  const time = timePartOf(current);
  return (
    <span className={cn("inline-flex w-full gap-2", className)}>
      <DatePart
        {...shared}
        id={id}
        className="min-w-0 flex-[3]"
        ariaLabel={ariaLabel ? `${ariaLabel} date` : undefined}
        labelledBy={labelledBy}
        min={min ? datePartOf(String(min)) : undefined}
        max={max ? datePartOf(String(max)) : undefined}
        value={day}
        onCommit={(d) => commit(d ? `${d}T${time || "09:00"}` : "")}
      >
        {hidden}
      </DatePart>
      <TimePart
        {...shared}
        autoFocus={false}
        className="min-w-0 flex-[2]"
        ariaLabel={ariaLabel ? `${ariaLabel} time` : undefined}
        labelFor={id}
        step={step}
        value={time}
        onCommit={(t) => {
          // Clearing the time alone keeps the date and time you had.
          if (t) commit(`${day || toIsoDate(new Date())}T${t}`);
        }}
      />
    </span>
  );
}

interface PartProps {
  id?: string;
  value: string;
  onCommit: (value: string) => void;
  onLeave: () => void;
  className?: string;
  size: Size;
  unstyled: boolean;
  style?: React.CSSProperties;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  ariaLabel?: string;
  labelledBy?: string;
  describedBy?: string;
  invalid?: React.AriaAttributes["aria-invalid"];
  /** The id a <label for> points at, for naming a part that has no label of its own. */
  labelFor?: string;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  children?: React.ReactNode;
}

/**
 * The text in a part. It follows the value, except that while you type it
 * keeps your own spelling of the value it already holds (25/9/2026), and
 * text that isn't a valid date or time stays in the field, marked invalid,
 * instead of being thrown away.
 */
function useDraft(value: string, parse: (text: string) => string | null) {
  const [draft, setDraft] = React.useState(value);
  const [invalid, setInvalid] = React.useState(false);
  const [seen, setSeen] = React.useState(value);
  if (seen !== value) {
    setSeen(value);
    setInvalid(false);
    setDraft((d) => (parse(d) === value ? d : value));
  }
  return { draft, setDraft, invalid, setInvalid };
}

/** Values in these formats sort as text, so min/max compare as strings. */
function inRange(v: string, min?: string | number, max?: string | number) {
  return (!min || v >= String(min)) && (!max || v <= String(max));
}

/** "" for an empty field, the value in the native format, or null for text that isn't a date/time in range. */
function accept(text: string, parse: (text: string) => string | null, p: PartProps): string | null {
  const t = text.trim();
  if (t === "") return "";
  const v = parse(t);
  return v && inRange(v, p.min, p.max) ? v : null;
}

/** Marks the visible field invalid for the browser too, so a form won't submit around it. */
function useValidity(ref: React.RefObject<HTMLInputElement | null>, invalid: boolean, message: string) {
  React.useEffect(() => {
    ref.current?.setCustomValidity(invalid ? message : "");
  }, [ref, invalid, message]);
}

/** Opens below the field, or above it when there's more room there and too little below. */
function opensAbove(el: HTMLElement | null, height: number) {
  const r = el?.getBoundingClientRect();
  if (!r) return false;
  const below = window.innerHeight - r.bottom;
  return below < height && r.top > below;
}

function Box({
  icon,
  size,
  unstyled,
  onIconDown,
  children,
}: {
  icon: React.ReactNode;
  size: Size;
  unstyled: boolean;
  onIconDown: () => void;
  children: React.ReactNode;
}) {
  return (
    <span
      className={inputBoxClassName("h-full items-center", unstyled)}
      data-size={size}
      data-slot="input-control"
      onMouseDown={forwardBoxClick}
    >
      <span
        aria-hidden
        className="flex shrink-0 cursor-pointer items-center ps-2.5 text-(--icon-secondary)"
        onMouseDown={(e) => {
          e.preventDefault();
          onIconDown();
        }}
      >
        {icon}
      </span>
      {children}
    </span>
  );
}

const DATE_MESSAGE = "Enter a valid date, like 25/09/2026.";
const TIME_MESSAGE = "Enter a valid time, like 09:30.";

/**
 * A date you type (the accessible way in), with Polaris's calendar as a
 * pointer shortcut. Focus stays in the field, so the calendar is hidden from
 * assistive tech and kept out of the tab order.
 */
function DatePart(p: PartProps) {
  const { draft, setDraft, invalid, setInvalid } = useDraft(p.value, parseDateText);
  const [open, setOpen] = React.useState(false);
  const [above, setAbove] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const calendarRef = React.useRef<HTMLDivElement>(null);
  const locked = p.disabled || p.readOnly;
  useValidity(inputRef, invalid, DATE_MESSAGE);

  React.useLayoutEffect(() => {
    calendarRef.current?.querySelectorAll("button").forEach((b) => (b.tabIndex = -1));
  });

  function show() {
    if (locked) return;
    setAbove(opensAbove(inputRef.current, 330));
    setOpen(true);
  }
  /** Commits what's typed, or marks it invalid. */
  function settle() {
    const v = accept(draft, parseDateText, p);
    if (v === null) {
      setInvalid(true);
      return;
    }
    p.onCommit(v);
    setDraft(v);
  }

  return (
    <Popover
      className={cn("inline-flex w-full align-top", p.className)}
      active={open}
      onClose={() => setOpen(false)}
      preferredPosition={above ? "above" : "below"}
      activator={
        <Box
          icon={<Calendar className="size-4" />}
          size={p.size}
          unstyled={p.unstyled}
          onIconDown={() => {
            inputRef.current?.focus();
            if (open) setOpen(false);
            else show();
          }}
        >
          <input
            ref={inputRef}
            id={p.id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            data-slot="input"
            className={cn(inputControlClassName(p.size), "ps-2")}
            style={p.style}
            placeholder={p.placeholder || "YYYY-MM-DD"}
            value={draft}
            disabled={p.disabled}
            readOnly={p.readOnly}
            required={p.required}
            autoFocus={p.autoFocus}
            aria-label={p.ariaLabel}
            aria-labelledby={p.labelledBy}
            aria-describedby={p.describedBy}
            aria-invalid={p.invalid || invalid || undefined}
            onFocus={p.onFocus}
            onClick={show}
            onChange={(e) => {
              const text = e.target.value;
              setDraft(text);
              setInvalid(false);
              // Clearing counts straight away, and so does a whole date
              // (four-digit year); a two-digit year waits until you leave.
              const v = accept(text, parseDateText, p);
              if (v === "" || (v && /\d{4}/.test(text))) p.onCommit(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && !open) {
                e.preventDefault();
                show();
                return;
              }
              if (e.key === "Escape" && open) {
                e.preventDefault();
                setOpen(false);
                return;
              }
              if (e.key === "Enter") {
                settle();
                if (open) {
                  e.preventDefault();
                  setOpen(false);
                }
              } else if (e.key === "Tab") setOpen(false);
              p.onKeyDown?.(e);
            }}
            onBlur={() => {
              setOpen(false);
              settle();
              p.onLeave();
            }}
          />
          {p.children}
        </Box>
      }
    >
      {/* Clicks in the calendar leave focus in the field. */}
      <div ref={calendarRef} aria-hidden onMouseDown={(e) => e.preventDefault()}>
        <DatePicker
          key={p.value}
          className="shadow-none"
          selected={fromIsoDate(p.value)}
          disableDatesBefore={p.min ? fromIsoDate(String(p.min)) : undefined}
          disableDatesAfter={p.max ? fromIsoDate(String(p.max)) : undefined}
          onChange={({ start }) => {
            const v = toIsoDate(start);
            p.onCommit(v);
            setDraft(v);
            setOpen(false);
          }}
        />
      </div>
    </Popover>
  );
}

function TimePart(p: PartProps) {
  const { draft, setDraft, invalid, setInvalid } = useDraft(p.value, parseTimeText);
  const [open, setOpen] = React.useState(false);
  const [above, setAbove] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  // Set once the arrows or the pointer move the highlight: until then Enter
  // takes the time as typed (14:05), not the nearest listed one.
  const [navigated, setNavigated] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const centre = React.useRef(false);
  const autoId = React.useId();
  const listId = `${p.id ?? autoId}-times`;
  const locked = p.disabled || p.readOnly;
  useValidity(inputRef, invalid, TIME_MESSAGE);

  // A datetime field's time half has no <label> of its own: borrow the
  // field's, so it reads as "Moved at time".
  React.useEffect(() => {
    const el = inputRef.current;
    if (!el || p.ariaLabel || !p.labelFor) return;
    const label = document.querySelector(`label[for="${CSS.escape(p.labelFor)}"]`)?.textContent?.trim();
    el.setAttribute("aria-label", label ? `${label} time` : "Time");
  }, [p.ariaLabel, p.labelFor]);

  // Every 15 minutes, or the field's own step (in seconds) when that's 5
  // minutes or more; only times between min and max.
  const every = p.step && Number(p.step) >= 300 ? Math.round(Number(p.step) / 60) : 15;
  const times = React.useMemo(
    () =>
      Array.from({ length: Math.ceil(1440 / every) }, (_, i) => {
        const m = i * every;
        return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      }).filter((t) => inRange(t, p.min, p.max)),
    [every, p.min, p.max],
  );
  /** The first listed time at or after `hhmm`. */
  const nearest = (hhmm: string) => {
    const at = times.findIndex((t) => minutesOf(t) >= minutesOf(hhmm));
    return at < 0 ? times.length - 1 : at;
  };
  const now = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  function show() {
    if (locked) return;
    setAbove(opensAbove(inputRef.current, 260));
    setActive(nearest(parseTimeText(draft) ?? (p.value || now())));
    setNavigated(false);
    centre.current = true;
    setOpen(true);
  }
  function pick(i: number) {
    const t = times[i];
    if (!t) return;
    p.onCommit(t);
    setDraft(t);
    setInvalid(false);
    setOpen(false);
  }
  /** Commits what's typed, or marks it invalid. */
  function settle() {
    const v = accept(draft, parseTimeText, p);
    if (v === null) {
      setInvalid(true);
      return;
    }
    p.onCommit(v);
    setDraft(v);
  }

  // Keep the highlighted time in view (centred when the list opens).
  React.useLayoutEffect(() => {
    const list = listRef.current;
    const el = list?.children[active] as HTMLElement | undefined;
    if (!open || !list || !el) return;
    if (centre.current) {
      list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2;
      centre.current = false;
    } else if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop - 6;
    else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight + 6;
  }, [open, active]);

  const optId = (i: number) => `${listId}-${i}`;

  return (
    <Popover
      className={cn("inline-flex w-full align-top", p.className)}
      active={open}
      onClose={() => setOpen(false)}
      preferredPosition={above ? "above" : "below"}
      fullWidth
      activator={
        <Box
          icon={<Clock className="size-4" />}
          size={p.size}
          unstyled={p.unstyled}
          onIconDown={() => {
            inputRef.current?.focus();
            if (open) setOpen(false);
            else show();
          }}
        >
          <input
            ref={inputRef}
            id={p.id}
            type="text"
            autoComplete="off"
            spellCheck={false}
            data-slot="input"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={open && navigated && active >= 0 ? optId(active) : undefined}
            className={cn(inputControlClassName(p.size), "ps-2")}
            style={p.style}
            placeholder={p.placeholder || "HH:MM"}
            value={draft}
            disabled={p.disabled}
            readOnly={p.readOnly}
            required={p.required}
            autoFocus={p.autoFocus}
            aria-label={p.ariaLabel}
            aria-labelledby={p.labelledBy}
            aria-describedby={p.describedBy}
            aria-invalid={p.invalid || invalid || undefined}
            onFocus={p.onFocus}
            onClick={() => (open ? undefined : show())}
            onChange={(e) => {
              const text = e.target.value;
              setDraft(text);
              setInvalid(false);
              setNavigated(false);
              const v = accept(text, parseTimeText, p);
              if (v) setActive(nearest(v));
              // Clearing counts straight away, and so does "9:30" or "0930";
              // "9" waits until you leave.
              if (v === "" || (v && /^\d{1,2}[:.]\d{2}$|^\d{4}$/.test(text.trim()))) p.onCommit(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (!open) show();
                else {
                  setNavigated(true);
                  setActive((a) => (e.key === "ArrowDown" ? Math.min(times.length - 1, a + 1) : Math.max(0, a - 1)));
                }
                return;
              }
              if (e.key === "Escape" && open) {
                e.preventDefault();
                setOpen(false);
                return;
              }
              if (e.key === "Enter") {
                if (open) {
                  e.preventDefault();
                  if (navigated) pick(active);
                  else {
                    settle();
                    setOpen(false);
                  }
                } else settle();
              } else if (e.key === "Tab") setOpen(false);
              p.onKeyDown?.(e);
            }}
            onBlur={() => {
              setOpen(false);
              settle();
              p.onLeave();
            }}
          />
          {p.children}
        </Box>
      }
    >
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={p.ariaLabel ?? "Times"}
        className="p-optionlist max-h-60 overflow-y-auto"
        onMouseDown={(e) => e.preventDefault()}
      >
        {times.map((t, i) => {
          const on = t === p.value;
          return (
            <div
              key={t}
              id={optId(i)}
              role="option"
              aria-selected={on}
              className={cn(
                "p-optionlist__item body-md-numeric shrink-0",
                on && "p-optionlist__item--selected",
                i === active && "p-optionlist__item--active",
              )}
              onMouseMove={() => {
                if (i === active) return;
                setNavigated(true);
                setActive(i);
              }}
              onClick={() => pick(i)}
            >
              <span>{t}</span>
            </div>
          );
        })}
      </div>
    </Popover>
  );
}
