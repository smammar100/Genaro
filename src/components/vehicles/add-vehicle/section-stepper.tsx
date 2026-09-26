"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { scrollParent, scrollToElement } from "./scroll";

export type StepperSection = {
  /** DOM id of the section wrapper this step scrolls to. */
  anchorId: string;
  title: string;
  /** A short second line, written to fit without truncating. */
  hint: string;
  /** Every important (asterisked) field in the section is filled: shows a check. */
  complete: boolean;
};

/** Gap left between the sticky stepper and a section it scrolls to. */
const GAP = 16;

/**
 * CSS custom property, set on the scroll area, holding how far below its top
 * the sticky stepper ends. Other sticky content (the sidebar) uses it as its
 * `top` so the two never overlap.
 */
export const STEPPER_OFFSET_VAR = "--section-stepper-offset";

/**
 * Horizontal section navigation for the one-page Add vehicle form: a numbered
 * step per section with connector lines, sticky under the top bar. Clicking
 * a step scrolls to its section and focuses the section's first card
 * heading; the section in view is highlighted (IntersectionObserver). A
 * step's circle turns into a check once its important fields are filled.
 * The steps always fit the row: content-width steps with growing connectors
 * between them, and only circles plus the current label below lg.
 */
export function SectionStepper({
  sections,
  endSentinelId,
}: {
  sections: StepperSection[];
  /** An element at the foot of the form: once it is in view, the last step is current. */
  endSentinelId?: string;
}) {
  const navRef = React.useRef<HTMLElement>(null);
  const [active, setActive] = React.useState(sections[0]?.anchorId ?? "");
  const anchorKey = sections.map((s) => s.anchorId).join("|");
  // A clicked step stays current until the user scrolls themselves, even if
  // the page can't scroll far enough to bring its section to the top.
  const lockedRef = React.useRef(false);

  // How far below the scroll area's top the sticky stepper ends (its wrapper
  // adds 8px above and below the strip). Re-measured if the strip resizes.
  const [offset, setOffset] = React.useState(0);
  React.useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => setOffset(nav.offsetHeight + GAP);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  // Keyboard focus and scrolling should clear the sticky stepper, and the
  // sidebar sticks just under it.
  React.useEffect(() => {
    const root = scrollParent(navRef.current);
    if (!root || !offset) return;
    const previousPadding = root.style.scrollPaddingTop;
    root.style.scrollPaddingTop = `${offset}px`;
    root.style.setProperty(STEPPER_OFFSET_VAR, `${offset}px`);
    return () => {
      root.style.scrollPaddingTop = previousPadding;
      root.style.removeProperty(STEPPER_OFFSET_VAR);
    };
  }, [offset]);

  // Scrollspy. The observed band starts under the sticky stepper and ends at
  // the upper half of the scroll area; the first section inside it is current.
  React.useEffect(() => {
    const nav = navRef.current;
    if (!nav || !offset || typeof IntersectionObserver === "undefined") return;
    const order = anchorKey.split("|");
    const root = scrollParent(nav);

    const visible = new Set<string>();
    let atEnd = false;
    const pick = () => {
      if (lockedRef.current) return;
      const current = atEnd ? order[order.length - 1] : order.find((id) => visible.has(id));
      if (current) setActive(current);
    };

    const sectionsIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        pick();
      },
      // The band starts a little below the stepper, so the sliver of a
      // section that has almost scrolled away doesn't keep it current.
      { root, rootMargin: `-${offset + 48}px 0px -50% 0px` },
    );
    for (const id of order) {
      const el = document.getElementById(id);
      if (el) sectionsIo.observe(el);
    }

    const end = endSentinelId ? document.getElementById(endSentinelId) : null;
    const endIo = end
      ? new IntersectionObserver(
          ([e]) => {
            atEnd = e.isIntersecting;
            pick();
          },
          { root },
        )
      : null;
    if (end) endIo?.observe(end);

    // Any scroll the user starts releases a clicked step's lock.
    const scroller: HTMLElement | Window = root ?? window;
    const unlock = () => {
      if (!lockedRef.current) return;
      lockedRef.current = false;
      pick();
    };
    const opts = { passive: true } as const;
    scroller.addEventListener("wheel", unlock, opts);
    scroller.addEventListener("touchmove", unlock, opts);
    scroller.addEventListener("keydown", unlock);

    return () => {
      sectionsIo.disconnect();
      endIo?.disconnect();
      scroller.removeEventListener("wheel", unlock);
      scroller.removeEventListener("touchmove", unlock);
      scroller.removeEventListener("keydown", unlock);
    };
  }, [anchorKey, endSentinelId, offset]);

  function goTo(anchorId: string) {
    const el = document.getElementById(anchorId);
    if (!el) return;
    scrollToElement(el, "start");
    const heading = el.querySelector<HTMLElement>("h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    lockedRef.current = true;
    setActive(anchorId);
  }

  // Step tracks alternate with connector tracks that share the leftover width.
  const columns = (step: string, minGap: string) =>
    sections.map((_, i) => `${i > 0 ? `minmax(${minGap}, 1fr) ` : ""}${step}`).join(" ");

  return (
    <div className="sticky top-0 z-10 bg-(--bg) py-2">
      <nav
        ref={navRef}
        aria-label="Form sections"
        className="overflow-hidden rounded-(--radius-300) bg-(--bg-surface) shadow-(--shadow-100)"
      >
        {/* A grid: steps are content-width (up to their max-content) and the
            connector tracks share what is left, so every gap is equal and
            the last step ends at the right padding; from lg every label fits
            whole. Below lg only the circles and the current label show (it
            may truncate on the narrowest phones). Never a scrollbar. */}
        <ol
          className="grid w-full items-center p-1.5 [grid-template-columns:var(--stepper-cols)] lg:[grid-template-columns:var(--stepper-cols-lg)]"
          style={
            {
              // Below lg a step may shrink (truncate); from lg it never does.
              "--stepper-cols": columns("minmax(0, max-content)", "0.5rem"),
              "--stepper-cols-lg": columns("max-content", "1.5rem"),
            } as React.CSSProperties
          }
        >
          {sections.map((s, i) => {
            const on = s.anchorId === active;
            const { complete } = s;
            const prevComplete = i > 0 && sections[i - 1].complete;
            return (
              <React.Fragment key={s.anchorId}>
                {i > 0 && (
                  <li
                    aria-hidden
                    className={cn(
                      "mx-0.5 h-px lg:mx-1",
                      prevComplete ? "bg-(--border-success)" : "bg-(--border)",
                    )}
                  />
                )}
                <li className="flex min-w-0">
                  <button
                    type="button"
                    onClick={() => goTo(s.anchorId)}
                    aria-current={on ? "location" : undefined}
                    className={cn(
                      "flex min-w-0 items-center gap-2 rounded-(--radius-200) px-1.5 py-1 text-left transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--border-focus)",
                      on ? "bg-(--bg-surface-selected)" : "hover:bg-(--bg-surface-hover)",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full body-xs-semibold",
                        on
                          ? "bg-(--bg-fill-brand) text-(--text-brand-on-bg-fill)"
                          : complete
                            ? "bg-(--bg-fill-success) text-(--text-success-on-bg-fill)"
                            : "bg-(--bg-fill-secondary) text-(--text-secondary)",
                      )}
                    >
                      {complete ? <Check className="size-3.5" aria-hidden /> : i + 1}
                    </span>
                    <span className={cn("min-w-0", !on && "max-lg:sr-only")}>
                      <span
                        className={cn(
                          "block whitespace-nowrap max-lg:truncate",
                          on ? "body-md-semibold" : "body-md",
                        )}
                      >
                        {s.title}
                        {complete ? <span className="sr-only"> (complete)</span> : null}
                      </span>
                      <span className="block whitespace-nowrap body-sm text-(--text-secondary) max-lg:truncate">
                        {s.hint}
                      </span>
                    </span>
                  </button>
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
