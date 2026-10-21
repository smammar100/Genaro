"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/polaris";

/** How long the pointer rests on something before its tooltip shows. */
const DELAY = 350;
const GAP = 8;

interface Tip {
  text: string;
  x: number;
  y: number;
  below: boolean;
}

/** Where a tooltip for `el` goes: above it, or below near the top of the window. */
function placeFor(el: Element, text: string): Tip {
  const r = el.getBoundingClientRect();
  const below = r.top < 48;
  // Tooltips are at most 200px wide; keep one near an edge on screen.
  const x = Math.min(Math.max(r.left + r.width / 2, 108), window.innerWidth - 108);
  return { text, x, y: below ? r.bottom + GAP : r.top - GAP, below };
}

/**
 * Every `title` in the app shows as a Polaris tooltip, never the browser's
 * own yellow box. While the pointer (or keyboard focus) is on an element, its
 * title moves to `data-p-title` and the attribute is left empty — an empty
 * title also stops the element inheriting an ancestor's — and a Polaris
 * tooltip appears above it (below it near the top of the window). The text
 * stays with assistive tech as `aria-description` (or `aria-label` when it
 * was the element's only name). All of it goes back when the pointer or focus
 * leaves. `data-tooltip` gets the same tooltip where a title can't go (SVG
 * marks). Mounted once in the root layout.
 */
export function TitleTooltips() {
  const [tip, setTip] = React.useState<Tip | null>(null);

  React.useEffect(() => {
    let current: HTMLElement | null = null;
    let timer: number | undefined;

    const hide = () => {
      window.clearTimeout(timer);
      setTip(null);
    };

    const release = () => {
      hide();
      const el = current;
      current = null;
      if (!el) return;
      const text = el.getAttribute("data-p-title");
      el.removeAttribute("data-p-title");
      if (el.hasAttribute("data-p-title-label")) {
        el.removeAttribute("data-p-title-label");
        el.removeAttribute("aria-label");
      } else el.removeAttribute("aria-description");
      // A title React set meanwhile wins over the one we took.
      if (text != null && el.getAttribute("title") === "") el.setAttribute("title", text);
    };

    const take = (el: HTMLElement) => {
      if (el === current) return;
      release();
      const own = el.getAttribute("title");
      const text = own || el.getAttribute("data-tooltip");
      if (!text || !text.trim()) return;
      current = el;
      if (own) {
        el.setAttribute("data-p-title", own);
        el.setAttribute("title", "");
      }
      const named = el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby") || el.textContent?.trim();
      if (named) el.setAttribute("aria-description", text);
      else {
        el.setAttribute("aria-label", text);
        el.setAttribute("data-p-title-label", "");
      }
      timer = window.setTimeout(() => {
        if (current !== el || !el.isConnected) return;
        setTip(placeFor(el, text));
      }, DELAY);
    };

    const titled = (target: EventTarget | null) =>
      target instanceof Element
        ? (target.closest('[title]:not([title=""]), [data-p-title], [data-tooltip]') as HTMLElement | null)
        : null;

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = titled(e.target);
      if (el) take(el);
      else if (current) release();
    };
    const onOut = (e: PointerEvent) => {
      if (!current) return;
      const to = e.relatedTarget as Node | null;
      if (to && current.contains(to)) return;
      release();
    };
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target.matches?.(":focus-visible")) return;
      const el = titled(target);
      if (el) take(el);
    };
    const onFocusOut = () => {
      if (current && !current.matches(":hover")) release();
    };

    // A click, key or scroll hides the tooltip, but the element stays taken
    // until the pointer leaves, so the browser's own can't appear instead.
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("keydown", hide, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", release);
    return () => {
      release();
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("keydown", hide, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", release);
    };
  }, []);

  return (
    <>
      {tip ? <Bubble tip={tip} role="tooltip" /> : null}
      <ValidationBubbles />
    </>
  );
}

/**
 * The browser's own "Please fill out this field" bubble, as a Polaris one:
 * when a form's built-in checks stop a submit, the first field at fault gets
 * focus and its message shows above it until you type, click or scroll.
 */
function ValidationBubbles() {
  const [tip, setTip] = React.useState<Tip | null>(null);

  React.useEffect(() => {
    let shownAt = -Infinity;
    const onInvalid = (e: Event) => {
      const el = e.target as HTMLInputElement;
      e.preventDefault();
      // One submit flags every invalid field; speak for the first.
      const now = performance.now();
      if (now - shownAt < 300) return;
      shownAt = now;
      el.focus();
      // A visually hidden input (a date field's value) speaks through the
      // field you can see.
      const anchor =
        (el.getBoundingClientRect().width <= 1 &&
          el.parentElement?.querySelector<HTMLElement>("[data-slot='input']")) ||
        el;
      // Measure once focusing has scrolled the field into view.
      requestAnimationFrame(() => setTip(placeFor(anchor, el.validationMessage || "Check this field.")));
    };
    const hide = () => setTip(null);
    // The scroll that focusing the field causes isn't the user scrolling away.
    const onScroll = () => {
      if (performance.now() - shownAt > 300) hide();
    };
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", hide, true);
    document.addEventListener("pointerdown", hide, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", hide, true);
      document.removeEventListener("pointerdown", hide, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  return tip ? <Bubble tip={tip} role="alert" critical /> : null;
}

function Bubble({ tip, role, critical }: { tip: Tip; role: "tooltip" | "alert"; critical?: boolean }) {
  return createPortal(
    <span
      role={role}
      className={`p-tooltip ${tip.below ? "p-tooltip--below" : "p-tooltip--above"}`}
      style={{
        position: "fixed",
        left: tip.x,
        top: tip.y,
        bottom: "auto",
        transform: tip.below ? "translateX(-50%)" : "translate(-50%, -100%)",
        zIndex: 1000,
      }}
    >
      <span className="p-tooltip__content">
        {critical ? (
          <Icon source="AlertMinor" tone="critical" />
        ) : null}
        {tip.text}
      </span>
    </span>,
    document.body,
  );
}
