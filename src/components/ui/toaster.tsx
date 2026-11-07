"use client";

import { useSyncExternalStore } from "react";
import { Toast } from "@/components/genaro";

/**
 * Toasts: Genaro's Toast (after React Bits' Swipe Toast, 2026-11-07) stacked
 * at the bottom centre: the brand fill (dark in light mode, white in dark
 * mode), a line burning down while the timer runs, swipe down to dismiss;
 * errors on the critical fill. Backed by a tiny store we own end to end;
 * src/lib/toast.ts is the public `toast.*` API. Each toast keeps its own
 * timer, so hovering one pauses it.
 */
type ToastVariant = "default" | "danger";

interface ToastInput {
  message: string;
  variant?: ToastVariant;
  /** ms before it closes itself; 0/undefined = stays until closed. */
  autoDismiss?: number;
}

interface ToastItem extends ToastInput {
  id: string;
}

let items: ToastItem[] = [];
const listeners = new Set<(t: ToastItem[]) => void>();
let seq = 0;

function emit(): void {
  for (const l of listeners) l(items);
}

/** Show a toast from anywhere; returns an id for `removeToast`. */
export function addToast(input: ToastInput): string {
  const id = `t${++seq}`;
  // Keep the stack short: three is the most that still reads as a stack
  // rather than a wall.
  items = [...items.slice(-2), { ...input, id }];
  emit();
  return id;
}

/** Remove a toast at once (its own exit has already played, or isn't wanted). */
export function removeToast(id: string): void {
  items = items.filter((i) => i.id !== id);
  emit();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}
const getItems = () => items;
const NO_ITEMS: ToastItem[] = [];
const getNoItems = () => NO_ITEMS;

/** Mounted once in the root layout. */
export function Toaster(): React.ReactElement {
  const list = useSyncExternalStore(subscribe, getItems, getNoItems);

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--space-600)+env(safe-area-inset-bottom,0px))] z-[100] flex flex-col items-center px-4 [&_.p-toast]:pointer-events-auto"
    >
      {list.map((t) => (
        <Toast
          key={t.id}
          content={t.message}
          error={t.variant === "danger"}
          duration={t.autoDismiss}
          onDismiss={() => removeToast(t.id)}
        />
      ))}
    </div>
  );
}
