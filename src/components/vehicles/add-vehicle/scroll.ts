/** The nearest ancestor that scrolls vertically (the Frame's main area). */
export function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement ?? null; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY === "auto" || overflowY === "scroll") return p;
  }
  return null;
}

/**
 * Scroll only the element's own scroll area so it sits at the top (below the
 * area's scroll-padding, i.e. the sticky stepper) or in the middle. Unlike
 * scrollIntoView, this never scrolls outer overflow-hidden ancestors (the
 * Frame) when the target is near the end of the page.
 */
export function scrollToElement(el: HTMLElement, block: "start" | "center") {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";
  const root = scrollParent(el);
  if (!root) {
    el.scrollIntoView({ behavior, block });
    return;
  }
  const rootTop = root.getBoundingClientRect().top;
  const rect = el.getBoundingClientRect();
  const padTop = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
  const offset =
    block === "start"
      ? rect.top - rootTop - padTop
      : rect.top - rootTop - padTop - (root.clientHeight - padTop - rect.height) / 2;
  root.scrollTo({ top: root.scrollTop + offset, behavior });
}
