"use client";

import * as React from "react";
import { Popover } from "@/components/polaris";
import { cn } from "@/lib/utils";
import { writeValue } from "./input-value";

type SuggestInputProps = React.ComponentProps<"input"> & {
  /** Values offered as you type: Polaris's option list in place of a <datalist>. */
  suggestions: readonly string[];
  /** Classes for the block the list is anchored to (the input fills it). */
  wrapperClassName?: string;
};

/** How many suggestions show at once. */
const LIMIT = 8;

/**
 * A text input that offers matching values in a Polaris option list as you
 * type (or click, or press the down arrow). Picking one writes it into the
 * input as typing would, so the caller's onChange — or react-hook-form's
 * register() — gets it. Anything else can still be typed.
 */
export function SuggestInput({
  suggestions,
  wrapperClassName,
  ref,
  onChange,
  onKeyDown,
  onBlur,
  onClick,
  onFocus,
  ...props
}: SuggestInputProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(String(props.value ?? props.defaultValue ?? ""));
  const [active, setActive] = React.useState(-1);
  const autoId = React.useId();
  const listId = `${props.id ?? autoId}-suggestions`;
  const optId = (i: number) => `${listId}-${i}`;

  const matches = React.useMemo(() => {
    const q = text.trim().toLowerCase();
    const unique = [...new Set(suggestions)];
    const hits = q ? unique.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q) : unique;
    // Values that start with what's typed come first.
    return hits
      .map((s, i) => ({ s, i, starts: s.toLowerCase().startsWith(q) }))
      .sort((a, b) => Number(b.starts) - Number(a.starts) || a.i - b.i)
      .slice(0, LIMIT)
      .map((h) => h.s);
  }, [suggestions, text]);
  const showing = open && matches.length > 0 && !props.disabled && !props.readOnly;

  const setRef = React.useCallback(
    (el: HTMLInputElement | null) => {
      inputRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.RefObject<HTMLInputElement | null>).current = el;
    },
    [ref],
  );

  function pick(value: string) {
    const el = inputRef.current;
    if (el) writeValue(el, value);
    setText(value);
    setOpen(false);
    setActive(-1);
  }

  return (
    <Popover
      className={cn("block min-w-0", wrapperClassName)}
      active={showing}
      onClose={() => setOpen(false)}
      fullWidth
      activator={
        <input
          {...props}
          ref={setRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showing}
          aria-controls={showing ? listId : undefined}
          aria-activedescendant={showing && active >= 0 ? optId(active) : undefined}
          autoComplete="off"
          onFocus={(e) => {
            setText(e.currentTarget.value);
            onFocus?.(e);
          }}
          onClick={(e) => {
            setOpen(true);
            onClick?.(e);
          }}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
            onChange?.(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              if (!showing) {
                setOpen(true);
                setActive(e.key === "ArrowDown" ? 0 : matches.length - 1);
              } else {
                const n = matches.length;
                setActive((a) => (e.key === "ArrowDown" ? (a + 1) % n : (a - 1 + n) % n));
              }
              return;
            }
            if (showing && e.key === "Enter" && active >= 0) {
              e.preventDefault();
              pick(matches[active]);
              return;
            }
            if (showing && e.key === "Escape") {
              // Only the list closes, not an editor, modal or sheet around it.
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              return;
            }
            if (e.key === "Tab") setOpen(false);
            onKeyDown?.(e);
          }}
          onBlur={(e) => {
            setOpen(false);
            onBlur?.(e);
          }}
        />
      }
    >
      <div
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        className="p-optionlist"
        onMouseDown={(e) => e.preventDefault()}
      >
        {matches.map((s, i) => (
          <div
            key={s}
            id={optId(i)}
            role="option"
            aria-selected={i === active}
            className={cn("p-optionlist__item", i === active && "p-optionlist__item--active")}
            onMouseMove={() => i !== active && setActive(i)}
            onClick={() => pick(s)}
          >
            <span>{s}</span>
          </div>
        ))}
      </div>
    </Popover>
  );
}
