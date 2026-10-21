/**
 * Escape and outside clicks close the innermost layer first. Polaris popovers
 * (Select lists, calendars, time lists, menus) are portalled to <body>, so a
 * base-ui dialog, sheet or popover around the field would otherwise read a
 * click in the list as a click outside itself, and Escape meant for the list
 * as its own — and close, losing what was typed.
 */
import type { BaseUIChangeEventDetails } from "@base-ui/react/types";

function polarisPopoverOpen() {
  return document.querySelector(".p-popover__panel") !== null;
}

function inPolarisPopover(target: EventTarget | null | undefined) {
  return target instanceof Element && target.closest(".p-popover__panel") !== null;
}

type OpenChange<Details> = ((open: boolean, details: Details) => void) | undefined;

/** Wraps a base-ui Root's onOpenChange so it stays open for a Polaris popover's Escape or clicks. */
export function innermostFirst<Details extends BaseUIChangeEventDetails<string>>(onOpenChange: OpenChange<Details>) {
  return (open: boolean, details: Details) => {
    if (
      !open &&
      ((details.reason === "escape-key" && polarisPopoverOpen()) ||
        (details.reason === "outside-press" && inPolarisPopover(details.event?.target)))
    ) {
      details.cancel();
      return;
    }
    onOpenChange?.(open, details);
  };
}
