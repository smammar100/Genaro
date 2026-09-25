"use client";

import { useSearchParams } from "next/navigation";

/**
 * Dev-only grid overlay. Gated on `?grid=1` in the URL — so it never
 * shows for end users (they don't type that), and any developer or
 * designer can flip it on / off without touching code.
 *
 * Draws 12 translucent column tracks separated by 24px gutters, plus
 * a 4px baseline rhythm. `pointer-events-none` ensures the overlay
 * never intercepts clicks — every interactive element underneath
 * stays clickable while the overlay is up.
 *
 * Fixed over the viewport, aligned to a centred 1152px content cap
 * with 24px gutters — the page padding the shell and Polaris <Page>
 * use.
 *
 * See plan §G4 (path: `.claude/plans/`) for the spec.
 */
export function GridOverlay() {
  const params = useSearchParams();
  if (params.get("grid") !== "1") return null;

  const columnTracks = `
    repeating-linear-gradient(
      to right,
      color-mix(in srgb, var(--border-emphasis) 8%, transparent) 0 calc((1152px - 11 * 24px) / 12),
      transparent calc((1152px - 11 * 24px) / 12) calc(((1152px - 11 * 24px) / 12) + 24px)
    )
  `.trim();

  const baselineRhythm = `
    repeating-linear-gradient(
      to bottom,
      var(--bg-fill-transparent-hover) 0 1px,
      transparent 1px 4px
    )
  `.trim();

  return (
    <div
      aria-hidden="true"
      data-grid-overlay=""
      className="pointer-events-none fixed inset-0 z-50 mx-auto w-full max-w-[1152px] px-6"
      style={{
        backgroundImage: `${columnTracks}, ${baselineRhythm}`,
      }}
    />
  );
}
