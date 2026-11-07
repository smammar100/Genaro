'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { usePortalTarget } from './internal/usePortal';
import { UnstyledLink } from './GenaroProvider';
import type { Action } from './types';
import { cx } from './utils';

export interface ToastProps {
  /** Short confirmation: "Product saved". */
  content: string;
  /** Called once the toast has gone: after its exit, a swipe, Escape, the close button or the timer. Remove it here. */
  onDismiss?: () => void;
  error?: boolean;
  action?: Action;
  /** Goes by itself after this many ms, with a line burning down along the bottom. Hovering or focusing it pauses the line. Off by default. */
  duration?: number;
  /** Float at the bottom centre of the viewport (portal to <body>). Use this in apps; leave off to render in place. */
  floating?: boolean;
  className?: string;
}

/** Past this downward speed (px/ms) a release dismisses, however short the drag. */
const FLICK = 0.11;
/** Movement before a press counts as a drag, in px. */
const DEAD_ZONE = 3;
/** How far it gives when dragged up, in px. */
const RESIST = 24;
/** A slow drag dismisses once it has gone this far down, in px. */
const SWIPE_DISTANCE = 40;
/** The drop and the gap closing, in ms (matches the CSS). */
const EXIT_MS = 280;
const BURN: Keyframe[] = [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }];

const rubberband = (over: number, dim: number, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));

/**
 * Brief, non-disruptive confirmation (after React Bits' Swipe Toast, call
 * 2026-11-07): it rises from the bottom on the brand fill (dark in light mode,
 * white in dark mode), and goes when its timer line burns out, when it is
 * swiped down, or on Escape or the close button. Errors sit on the critical
 * fill.
 * @import import { Toast } from "@/components/genaro";
 */
export function Toast({ content, onDismiss, error, action, duration, floating, className }: ToastProps) {
  const target = usePortalTarget();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const fuseRef = React.useRef<HTMLElement>(null);
  const burn = React.useRef<Animation | null>(null);
  const flags = React.useRef({ hover: false, drag: false, focus: false, hidden: false });
  const drag = React.useRef<{ id: number; startY: number; grab: number | null; hist: [number, number][] } | null>(null);
  const offset = React.useRef(0);
  const [closing, setClosing] = React.useState(false);
  const closingRef = React.useRef(false);
  const dismissRef = React.useRef(onDismiss);
  React.useLayoutEffect(() => {
    dismissRef.current = onDismiss;
  });

  /** The timer line stops while you hover, drag, focus it or look away. */
  const syncBurn = React.useCallback(() => {
    const a = burn.current;
    if (!a) return;
    const f = flags.current;
    if (f.hover || f.drag || f.focus || f.hidden) a.pause();
    else if (a.playState === 'paused') a.play();
  }, []);

  const close = React.useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    burn.current?.pause();
    setClosing(true);
    window.setTimeout(() => dismissRef.current?.(), EXIT_MS);
  }, []);

  React.useEffect(() => {
    const el = fuseRef.current;
    if (!duration) return;
    if (!el || typeof el.animate !== 'function') {
      const t = window.setTimeout(close, duration);
      return () => window.clearTimeout(t);
    }
    const a = el.animate(BURN, { duration, easing: 'linear', fill: 'forwards' });
    a.onfinish = close;
    burn.current = a;
    syncBurn();
    return () => {
      a.onfinish = null;
      a.cancel();
      burn.current = null;
    };
  }, [duration, close, syncBurn]);

  React.useEffect(() => {
    const onVisibility = () => {
      flags.current.hidden = document.hidden;
      syncBurn();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [syncBurn]);

  const moveTo = (y: number) => {
    offset.current = y;
    if (cardRef.current) cardRef.current.style.transform = y ? `translateY(${y}px)` : '';
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || drag.current || closingRef.current) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a nicety: without it a fast drag can slip off the card.
    }
    drag.current = { id: e.pointerId, startY: e.clientY, grab: null, hist: [[performance.now(), offset.current]] };
    flags.current.drag = true;
    syncBurn();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (d.grab === null) {
      if (Math.abs(e.clientY - d.startY) < DEAD_ZONE) return;
      d.grab = e.clientY - offset.current;
      e.currentTarget.dataset.swiping = '';
    }
    const raw = e.clientY - d.grab;
    const y = raw >= 0 ? raw : rubberband(raw, RESIST);
    moveTo(y);
    d.hist.push([performance.now(), y]);
    if (d.hist.length > 4) d.hist.shift();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    delete e.currentTarget.dataset.swiping;
    flags.current.drag = false;
    const card = e.currentTarget;
    const y = offset.current;
    const [t0, y0] = d.hist[0];
    const [t1, y1] = d.hist[d.hist.length - 1];
    const v = d.hist.length < 2 || performance.now() - t1 > 100 ? 0 : (y1 - y0) / Math.max(1, t1 - t0);
    const animates = typeof card.animate === 'function';

    if (y > 0 && (v > FLICK || (y >= SWIPE_DISTANCE && v >= 0))) {
      // Swiped away: it carries on down and fades, then the gap closes.
      burn.current?.pause();
      if (animates) {
        const away = y + card.offsetHeight;
        card.animate(
          [{ transform: `translateY(${y}px)`, opacity: 1 }, { transform: `translateY(${away}px)`, opacity: 0 }],
          { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' },
        );
      }
      close();
      return;
    }
    if (y !== 0) {
      // Let go too early: it springs back with a little overshoot.
      moveTo(0);
      if (animates) {
        card.animate([{ transform: `translateY(${y}px)` }, { transform: 'translateY(0)' }], {
          duration: 450,
          easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
        });
      }
    }
    syncBurn();
  };

  const toast = (
    <div className="p-toast-slot" data-closing={closing ? '' : undefined}>
      <div className="p-toast-slot__gate">
        <div className="p-toast-slot__lift">
          <div
            ref={cardRef}
            className={cx('p-toast', error && 'p-toast--error', className)}
            role={error ? 'alert' : 'status'}
            aria-live={error ? 'assertive' : 'polite'}
            aria-atomic="true"
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerEnter={(e) => {
              if (e.pointerType !== 'mouse') return;
              flags.current.hover = true;
              syncBurn();
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== 'mouse') return;
              flags.current.hover = false;
              syncBurn();
            }}
            onFocus={() => {
              flags.current.focus = true;
              syncBurn();
            }}
            onBlur={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
              flags.current.focus = false;
              syncBurn();
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Escape') return;
              e.stopPropagation();
              close();
            }}
          >
            <span className="p-toast__msg">{content}</span>
            {action && action.url ? (
              <UnstyledLink
                url={action.url}
                external={action.external}
                className="p-toast__action"
                onClick={() => {
                  action.onAction?.();
                  close();
                }}
              >
                {action.content}
              </UnstyledLink>
            ) : action ? (
              <button
                type="button"
                className="p-toast__action"
                onClick={() => {
                  action.onAction?.();
                  close();
                }}
              >
                {action.content}
              </button>
            ) : null}
            <button type="button" className="p-toast__close" aria-label="Dismiss notification" onClick={close}>
              <Icon source="CancelSmallMinor" />
            </button>
            {duration ? <i ref={fuseRef} className="p-toast__fuse" aria-hidden /> : null}
          </div>
        </div>
      </div>
    </div>
  );
  if (!floating) return toast;
  if (!target) return null;
  return createPortal(<div className="p-toast-layer">{toast}</div>, target);
}
