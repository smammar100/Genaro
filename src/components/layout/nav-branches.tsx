"use client";

import * as React from "react";

/** The curve where a branch leaves the trunk, in px. */
const RADIUS = 6;
/**
 * Room between a branch's end and its row's highlight, in px. None: the page
 * names line up with the section's, so the branches only have ~11px to run.
 */
const GAP = 0;
/** The trunk's x: the open section's icon centre, where the sub-menu starts. */
const TRUNK = 0.5;

/**
 * Branched lines for an open sidebar section (after React Bits' Branched
 * Menu, call 2026-11-07): a trunk under the section's icon, a curved branch
 * into each page, and an accent line that draws from the section down to the
 * page you're on. Goes first inside a SidebarMenuSub; it measures the rows
 * beside it, so a row with a badge or a taller row still lines up. Lines are
 * the border token, the accent is the text colour, so both themes work.
 */
export function NavBranches({ activeIndex }: { activeIndex: number }) {
  const ref = React.useRef<HTMLLIElement>(null);
  const [shape, setShape] = React.useState<{ rows: number[]; end: number; height: number } | null>(null);

  React.useLayoutEffect(() => {
    const list = ref.current?.parentElement;
    if (!list || typeof ResizeObserver === "undefined") return;
    // The observer's first call measures too, so nothing is set during the effect itself.
    const ro = new ResizeObserver(() => {
      const items = Array.from(list.querySelectorAll<HTMLElement>(':scope > [data-sidebar="menu-sub-item"]'));
      setShape({
        rows: items.map((li) => li.offsetTop + li.offsetHeight / 2),
        end: (items[0]?.offsetLeft ?? 11) - GAP,
        height: list.clientHeight,
      });
    });
    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  const rows = shape?.rows ?? [];
  const end = shape?.end ?? 0;
  const r = Math.min(RADIUS, Math.max(0, end - TRUNK));
  const branch = (y: number) => `M ${TRUNK} ${y - r} A ${r} ${r} 0 0 0 ${TRUNK + r} ${y} H ${end}`;

  return (
    <li ref={ref} aria-hidden className="pointer-events-none absolute inset-y-0 left-0">
      {rows.length ? (
        <svg width={end} height={shape?.height ?? 0} className="nav-branches overflow-visible">
          <path className="nav-branches__base" d={`M ${TRUNK} 0 V ${rows[rows.length - 1] - r}`} />
          {rows.map((y, k) => (
            <path key={`base-${k}`} className="nav-branches__base" d={branch(y)} />
          ))}
          {rows.map((y, k) => (
            <path
              key={`reach-${k}`}
              className="nav-branches__reach"
              d={`M ${TRUNK} 0 V ${y - r} A ${r} ${r} 0 0 0 ${TRUNK + r} ${y} H ${end}`}
              // pathLength 1: the dash is the whole path, so one offset hides or draws it.
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={k === activeIndex ? 0 : 1}
            />
          ))}
        </svg>
      ) : null}
    </li>
  );
}
