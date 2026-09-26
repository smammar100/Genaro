"use client";

import * as React from "react";
import { Layout } from "@/components/polaris";
import { cn } from "@/lib/utils";
import { scrollParent } from "./scroll";
import { STEPPER_OFFSET_VAR } from "./section-stepper";

/** Space kept free under the sticky sidebar at the bottom of the view. */
const BOTTOM_GAP = 16;
/** The stack's gap (gap-4). */
const STACK_GAP = 16;
/** Used until the stepper has published its height. */
const FALLBACK_OFFSET = 88;

/**
 * The form's one-third sidebar, kept in view while the main column scrolls.
 * It sticks just under the section stepper (the stepper publishes its height
 * as STEPPER_OFFSET_VAR on the scroll area). When the whole stack fits the
 * view it sticks as one; when it is taller, only `pinned` (the cost summary)
 * sticks and the cards above it scroll away.
 */
export function StickySidebar({
  children,
  pinned,
}: {
  /** Cards above the pinned one. */
  children?: React.ReactNode;
  /** The card that must stay in view. */
  pinned: React.ReactNode;
}) {
  const stackRef = React.useRef<HTMLDivElement>(null);
  const [fits, setFits] = React.useState(true);

  React.useEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;
    const root = scrollParent(stack);
    const check = () => {
      // offsetHeight ignores sticky displacement, so this is the stack's
      // natural height whichever mode it is in.
      const cards = Array.from(stack.children) as HTMLElement[];
      const contentHeight =
        cards.reduce((h, c) => h + c.offsetHeight, 0) + STACK_GAP * Math.max(0, cards.length - 1);
      const offset =
        parseFloat(getComputedStyle(stack).getPropertyValue(STEPPER_OFFSET_VAR)) ||
        FALLBACK_OFFSET;
      const viewHeight = root?.clientHeight ?? window.innerHeight;
      setFits(contentHeight <= viewHeight - offset - BOTTOM_GAP);
    };
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(check);
    const observeAll = () => {
      if (!ro) return;
      ro.disconnect();
      for (const child of Array.from(stack.children)) ro.observe(child);
      if (root) ro.observe(root);
    };
    observeAll();
    check();
    // Cards come and go (the valuation card appears after a lookup).
    const mo = new MutationObserver(() => {
      observeAll();
      check();
    });
    mo.observe(stack, { childList: true });
    return () => {
      ro?.disconnect();
      mo.disconnect();
    };
  }, []);

  const stickyTop = "top-(--section-stepper-offset)";
  return (
    <Layout.Section
      variant="oneThird"
      // Whole stack sticky: the section itself sticks (self-start so the
      // Layout row doesn't stretch it). Otherwise the section stretches to
      // the row so the pinned card has room to travel.
      className={fits ? cn("sticky self-start", stickyTop) : "self-stretch"}
    >
      <div ref={stackRef} className={cn("flex flex-col gap-4", !fits && "flex-1")}>
        {children}
        <div className={cn(!fits && cn("sticky", stickyTop))}>{pinned}</div>
      </div>
    </Layout.Section>
  );
}
