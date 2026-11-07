'use client';

import * as React from 'react';
import {
  animate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from 'framer-motion';

/** The thumb's lag behind its own speed, and its hover swell (React Bits' Squish Switch). */
const FLOW_SPRING = { stiffness: 320, damping: 40, mass: 0.6 };
const SWELL_SPRING = { stiffness: 520, damping: 34, mass: 0.6 };
/** The most the thumb lengthens, as a fraction of its width. */
const MAX_STRETCH = 0.4;
/** How much of that stretch it actually gets: a 16px thumb needs more than the original's 30px one. */
const GAIN = 0.6;
/** The settle: a little overshoot, done in about a third of a second. */
const SETTLE = { type: 'spring' as const, stiffness: 170, damping: 21.5, mass: 0.9, restDelta: 0.001, restSpeed: 0.01 };

export interface Squish {
  /** The thumb's offset along the track, in px. */
  x: MotionValue<number>;
  scaleX: MotionValue<number>;
  scaleY: MotionValue<number>;
  /** Swell the thumb (hover) or let it go back. */
  swell: (on: boolean) => void;
}

/**
 * The squish-switch thumb (after React Bits' Squish Switch, 2026-11-07): it
 * springs to its side, lengthens with its speed and narrows to keep its area,
 * and swells a touch on hover. `travel()` gives the distance between the two
 * sides in px, read when it moves; while `held` (a drag) the caller sets `x`
 * itself and the spring waits.
 */
export function useSquish(on: boolean, travel: () => number, held = false): Squish {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const flow = useSpring(useVelocity(x), FLOW_SPRING);
  const swellValue = useSpring(1, SWELL_SPRING);
  const travelRef = React.useRef(travel);
  React.useLayoutEffect(() => {
    travelRef.current = travel;
  });

  const stretchOf = (v: number) => {
    const span = Math.max(1, travelRef.current());
    return 1 + Math.min(MAX_STRETCH, Math.abs(v) / (span * 10)) * (reduce ? 0 : GAIN);
  };
  const scaleX = useTransform([flow, swellValue], ([v, h]: number[]) => stretchOf(v) * h);
  const scaleY = useTransform([flow, swellValue], ([v, h]: number[]) => h / stretchOf(v));

  // The first placement jumps; every later change springs.
  const placed = React.useRef(false);
  React.useLayoutEffect(() => {
    if (held) return;
    const target = on ? travelRef.current() : 0;
    if (!placed.current || reduce) {
      placed.current = true;
      x.jump(target);
      return;
    }
    const controls = animate(x, target, SETTLE);
    return () => controls.stop();
  }, [on, held, reduce, x]);

  const swell = React.useCallback(
    (hovered: boolean) => swellValue.set(hovered && !reduce ? 1.08 : 1),
    [swellValue, reduce],
  );

  return { x, scaleX, scaleY, swell };
}
