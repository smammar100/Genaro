'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { InlineError } from './InlineError';
import { useSquish } from './internal/useSquish';
import { cx } from './utils';

export interface SwitchProps {
  /** What the switch turns on, as a positive statement: "Publish to AutoTrader". Required, even when hidden. */
  label: React.ReactNode;
  /** Controlled state; pair with `onChange`. */
  checked?: boolean;
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean;
  /** Called with the new state as soon as the switch flips. */
  onChange?: (checked: boolean, id: string) => void;
  /** What turning it on does, under the label in `text-secondary`. */
  helpText?: React.ReactNode;
  /** A string shows an InlineError; `true` only marks the switch invalid. */
  error?: React.ReactNode | boolean;
  /** Shows the switch but stops it changing. Say why in `helpText`. */
  disabled?: boolean;
  /** Visually hides the label; screen readers still read it. For rows that name the switch already. */
  labelHidden?: boolean;
  /**
   * `'end'` (default): the switch, then its label. `'start'`: the label and help text first and the switch at
   * the far end of the row, for a settings row.
   */
  labelPosition?: 'end' | 'start';
  /** Form field name: the switch posts `value` while it's on, and nothing while it's off. */
  name?: string;
  /** Posted while on (the browser default is `"on"`). */
  value?: string;
  /** DOM id of the switch; generated when omitted. */
  id?: string;
}

/** Movement before a press counts as a drag, in px: a finger wobbles more than a mouse. */
const TAP_SLOP = { mouse: 4, touch: 8 };

/**
 * An on/off toggle for a setting that applies at once, such as publishing to a channel. Checked fill is
 * bg-fill-brand-selected. The thumb squishes as it travels and can be dragged across (after React Bits' Squish
 * Switch). For an option saved with a form's submit button, use Checkbox.
 * @import import { Switch } from "@/components/genaro";
 */
export function Switch(props: SwitchProps) {
  const { label, helpText, error, disabled, labelHidden, labelPosition, name, value } = props;
  const autoId = React.useId();
  const id = props.id || autoId;
  const [inner, setInner] = React.useState(!!props.defaultChecked);
  const checked = props.checked != null ? props.checked : inner;
  const message = error && typeof error !== 'boolean' ? error : null;

  const trackRef = React.useRef<HTMLSpanElement>(null);
  const thumbRef = React.useRef<HTMLSpanElement>(null);
  /** Track width less the thumb and its inset either side. */
  const travel = () => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return 0;
    return track.clientWidth - thumb.offsetWidth - 2 * thumb.offsetLeft;
  };
  const [dragging, setDragging] = React.useState(false);
  const { x, scaleX, scaleY, swell } = useSquish(checked, travel, dragging);
  const grip = React.useRef<{ id: number; startX: number; from: number; moved: boolean; was: boolean; slop: number } | null>(null);
  const skipClick = React.useRef(false);
  const onRef = React.useRef(checked);
  React.useLayoutEffect(() => {
    onRef.current = checked;
  });

  const commit = (next: boolean) => {
    if (next === onRef.current) return;
    onRef.current = next;
    setInner(next);
    props.onChange?.(next, id);
  };

  return (
    <div
      className={cx(
        'p-switch',
        labelPosition === 'start' && 'p-switch--start',
        disabled && 'p-switch--disabled',
        !!error && 'p-switch--error',
      )}
    >
      <span className="p-switch__control">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="p-switch__input"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={(e) => commit(e.target.checked)}
          // Drag the thumb across: past the middle it flips, and the click that ends the drag is swallowed.
          onPointerDown={(e) => {
            if (disabled || grip.current || e.button !== 0) return;
            grip.current = {
              id: e.pointerId,
              startX: e.clientX,
              from: x.get(),
              moved: false,
              was: onRef.current,
              slop: e.pointerType === 'touch' ? TAP_SLOP.touch : TAP_SLOP.mouse,
            };
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Without capture a fast drag can slip off; the press still works as a tap.
            }
          }}
          onPointerMove={(e) => {
            const g = grip.current;
            if (!g || g.id !== e.pointerId) return;
            const dx = e.clientX - g.startX;
            if (!g.moved) {
              if (Math.abs(dx) <= g.slop) return;
              g.moved = true;
              setDragging(true);
            }
            const span = travel();
            const nx = Math.min(span, Math.max(0, g.from + dx));
            x.set(nx);
            commit(nx > span / 2);
          }}
          onPointerUp={(e) => {
            const g = grip.current;
            if (!g || g.id !== e.pointerId) return;
            grip.current = null;
            if (g.moved) skipClick.current = true;
            setDragging(false);
          }}
          onPointerCancel={(e) => {
            const g = grip.current;
            if (!g || g.id !== e.pointerId) return;
            grip.current = null;
            if (g.moved) commit(g.was);
            setDragging(false);
          }}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse' && !disabled) swell(true);
          }}
          onPointerLeave={() => swell(false)}
          onClick={(e) => {
            if (!skipClick.current) return;
            skipClick.current = false;
            e.preventDefault();
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? `${id}-error` : helpText ? `${id}-help` : undefined}
        />
        <span ref={trackRef} className="p-switch__track" aria-hidden>
          <motion.span ref={thumbRef} className="p-switch__thumb" style={{ x, scaleX, scaleY }} />
        </span>
      </span>
      <div className="p-switch__text">
        <label htmlFor={id} className={cx('p-switch__label', labelHidden && 'p-visually-hidden')}>
          {label}
        </label>
        {helpText ? (
          <div className="p-switch__help" id={`${id}-help`}>
            {helpText}
          </div>
        ) : null}
        {message ? <InlineError message={message} id={`${id}-error`} /> : null}
      </div>
    </div>
  );
}
