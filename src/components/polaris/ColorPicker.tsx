'use client';

import * as React from 'react';
import { cx } from './utils';

export interface HSBAColor {
  /** 0–359 */
  hue: number;
  /** 0–1 */
  saturation: number;
  /** 0–1 */
  brightness: number;
  /** 0–1 */
  alpha?: number;
}

/** Converts HSB (hue 0–359, saturation/brightness 0–1) to a #rrggbb hex string. */
export function hsbToHex(hue: number, saturation: number, brightness: number): string {
  const f = (n: number) => {
    const k = (n + hue / 60) % 6;
    return brightness - brightness * saturation * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return `#${[f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
}

export interface ColorPickerProps {
  /** Controlled when you also pass onChange. */
  color?: HSBAColor;
  onChange?: (color: HSBAColor) => void;
  allowAlpha?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const DEFAULT_COLOR: HSBAColor = { hue: 210, saturation: 0.8, brightness: 0.8, alpha: 1 };

/** Saturation/brightness square with hue (and optional alpha) sliders. */
export function ColorPicker({ color, onChange, allowAlpha, fullWidth, className }: ColorPickerProps) {
  const [inner, setInner] = React.useState<HSBAColor>(color || DEFAULT_COLOR);
  const col = color && onChange ? color : inner;
  function set(patch: Partial<HSBAColor>) {
    const next = { ...col, ...patch };
    setInner(next);
    onChange?.(next);
  }
  function drag(e: React.PointerEvent<HTMLDivElement>, fn: (x: number, y: number) => void) {
    const r = e.currentTarget.getBoundingClientRect();
    const move = (ev: { clientX: number; clientY: number }) =>
      fn(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)));
    move(e);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  const hex = hsbToHex(col.hue, col.saturation, col.brightness);
  return (
    <div className={cx('p-colorpicker', fullWidth && 'p-colorpicker--full', className)}>
      <div className="p-colorpicker__main" style={{ background: hsbToHex(col.hue, 1, 1) }} onPointerDown={(e) => drag(e, (x, y) => set({ saturation: x, brightness: 1 - y }))}>
        <div className="p-colorpicker__dragger" style={{ left: `${col.saturation * 100}%`, top: `${(1 - col.brightness) * 100}%`, background: hex }} />
      </div>
      <div className="p-colorpicker__hue" onPointerDown={(e) => drag(e, (_x, y) => set({ hue: y * 359 }))}>
        <div className="p-colorpicker__hue-knob" style={{ top: `${(col.hue / 359) * 100}%` }} />
      </div>
      {allowAlpha ? (
        <div className="p-colorpicker__hue p-colorpicker__alpha" style={{ '--p-cp': hex } as React.CSSProperties} onPointerDown={(e) => drag(e, (_x, y) => set({ alpha: 1 - y }))}>
          <div className="p-colorpicker__hue-knob" style={{ top: `${(1 - (col.alpha == null ? 1 : col.alpha)) * 100}%` }} />
        </div>
      ) : null}
    </div>
  );
}
