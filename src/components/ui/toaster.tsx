"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toasts — Shopify admin style: a dark pill at the bottom centre, white
 * 13px text, a close button; errors in critical red. Replaces the Nord
 * <nord-toast-group> (whose own dismiss timer never fired, GEN-123) with a
 * tiny store we own end to end.
 *
 * `addToast` / `removeToast` keep the old bridge's signatures, so
 * src/lib/toast.ts and every `toast.*` call site are unchanged.
 */
export type ToastVariant = "default" | "danger";

export interface ToastInput {
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
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let seq = 0;

function emit(): void {
  for (const l of listeners) l(items);
}

/** Show a toast from anywhere; returns an id for `removeToast`. */
export function addToast(input: ToastInput): string {
  const id = `t${++seq}`;
  // Keep the stack short: Shopify shows one message at a time; three is the
  // most that still reads as a stack rather than a wall.
  items = [...items.slice(-2), { ...input, id }];
  emit();
  if (input.autoDismiss && input.autoDismiss > 0) {
    timers.set(id, setTimeout(() => removeToast(id), input.autoDismiss));
  }
  return id;
}

/** Close a toast early. */
export function removeToast(id: string): void {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
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
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4"
    >
      {list.map((t) => (
        <div
          key={t.id}
          role={t.variant === "danger" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex max-w-md items-center gap-3 rounded-xl py-2.5 pl-4 pr-2 text-[13px] font-medium leading-5 text-white shadow-lg animate-in fade-in slide-in-from-bottom-2",
            t.variant === "danger" ? "bg-[#c70a24]" : "bg-[#1a1a1a]",
          )}
        >
          <span className="min-w-0">{t.message}</span>
          <button
            type="button"
            onClick={() => removeToast(t.id)}
            aria-label="Dismiss"
            className="grid size-6 shrink-0 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
