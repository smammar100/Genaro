/**
 * App-wide toast helper, backed by the Shopify-style <Toaster/>
 * (src/components/ui/toaster.tsx). `notify.*` and the sonner-shaped `toast`
 * object keep their APIs so call sites don't change. Errors render in critical
 * red; success/info/warning share the dark default (the message carries the
 * nuance), matching the Shopify admin.
 */
import { addToast, removeToast } from "@/components/ui/toaster";

interface ErrorOptions {
  retry?: () => void;
  duration?: number;
}

interface InfoOptions {
  duration?: number;
}

export const notify = {
  success: (message: string, opts: InfoOptions = {}) =>
    addToast({
      message,
      variant: "default",
      autoDismiss: opts.duration ?? 4000,
    }),

  error: (message: string, opts: ErrorOptions = {}) =>
    addToast({
      message,
      variant: "danger",
      autoDismiss: opts.duration ?? 6000,
    }),

  info: (message: string, opts: InfoOptions = {}) =>
    addToast({
      message,
      variant: "default",
      autoDismiss: opts.duration ?? 4000,
    }),

  warning: (message: string, opts: InfoOptions = {}) =>
    addToast({
      message,
      variant: "default",
      autoDismiss: opts.duration ?? 5000,
    }),
};

/**
 * Sonner-shaped facade over `notify` (callable + success/error/info/warning/
 * message/dismiss) — the API most call sites use.
 */
function baseToast(message: string, opts: InfoOptions = {}): void {
  notify.info(message, opts);
}

export const toast = Object.assign(baseToast, {
  success: (message: string, opts: InfoOptions = {}) =>
    notify.success(message, opts),
  error: (message: string, opts: ErrorOptions = {}) =>
    notify.error(message, opts),
  info: (message: string, opts: InfoOptions = {}) => notify.info(message, opts),
  warning: (message: string, opts: InfoOptions = {}) =>
    notify.warning(message, opts),
  message: (message: string, opts: InfoOptions = {}) =>
    notify.info(message, opts),
  // Dismisses a toast early by the id returned from a `toast.*` call. A bare
  // `dismiss()` with no id is a no-op (toasts auto-dismiss on their timer).
  dismiss: (id?: string | number): void => {
    if (typeof id === "string") removeToast(id);
  },
});
