'use client';

import * as React from 'react';
import { cx } from './utils';

export type RangeSliderValue = number | [number, number];

export interface RangeSliderProps {
  label?: string;
  /** A number, or [low, high] for a dual-thumb range. Controlled when you also pass onChange. */
  value?: RangeSliderValue;
  onChange?: (value: RangeSliderValue) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  helpText?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Pick a value or a range on a track (bg-fill-brand fill). */
export function RangeSlider({ label, value, onChange, min: minProp, max: maxProp, step, prefix, suffix, helpText, disabled, className }: RangeSliderProps) {
  const [inner, setInner] = React.useState<RangeSliderValue>(value != null ? value : 50);
  const v = value != null && onChange ? value : inner;
  const min = minProp || 0;
  const max = maxProp != null ? maxProp : 100;
  const pc = (x: number) => ((x - min) / (max - min)) * 100;
  function set(next: RangeSliderValue) {
    setInner(next);
    onChange?.(next);
  }
  const common = { min, max, step: step || 1, disabled };
  let track: React.CSSProperties;
  let inputs: React.ReactNode;
  if (Array.isArray(v)) {
    const [lo, hi] = v;
    track = { '--p-range-lo': `${pc(lo)}%`, '--p-range-hi': `${pc(hi)}%` } as React.CSSProperties;
    inputs = (
      <>
        <input type="range" className="p-range__input p-range__input--dual" {...common} value={lo} aria-label={`${label || ''} minimum`} onChange={(e) => set([Math.min(Number(e.target.value), hi), hi])} />
        <input type="range" className="p-range__input p-range__input--dual" {...common} value={hi} aria-label={`${label || ''} maximum`} onChange={(e) => set([lo, Math.max(Number(e.target.value), lo)])} />
      </>
    );
  } else {
    track = { '--p-range-lo': '0%', '--p-range-hi': `${pc(v)}%` } as React.CSSProperties;
    inputs = <input type="range" className="p-range__input" {...common} value={v} aria-label={label} onChange={(e) => set(Number(e.target.value))} />;
  }
  return (
    <div className={cx('p-range', disabled && 'p-range--disabled', className)}>
      {label ? <label className="p-range__label">{label}</label> : null}
      <div className="p-range__row">
        {prefix ? <span className="p-range__affix">{prefix}</span> : null}
        <div className="p-range__track" style={track}>
          {inputs}
        </div>
        {suffix ? <span className="p-range__affix">{suffix}</span> : null}
      </div>
      {helpText ? <div className="p-labelled__help">{helpText}</div> : null}
    </div>
  );
}
