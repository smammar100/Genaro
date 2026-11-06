"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

/** The first painted background at the very top of the page: the top bar in the app, the page on sign-in. */
function topColor(): string | null {
  let el = document.elementFromPoint(window.innerWidth / 2, 1);
  while (el) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== "transparent" && !/^rgba\(.*,\s*0\)$/.test(bg)) return bg;
    el = el.parentElement;
  }
  return null;
}

/**
 * Keeps the phone's status bar the colour of the top of the page
 * (emil-mobile-native §13). The theme switches by class, not by the phone's
 * setting, so a `prefers-color-scheme` pair of tags can't follow it: this
 * re-reads the colour whenever the theme or the page changes.
 */
export function ThemeColor() {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    // A frame later, so the new theme's tokens and the new page are painted.
    const frame = requestAnimationFrame(() => {
      const color = topColor();
      if (!color) return;
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      meta.content = color;
    });
    return () => cancelAnimationFrame(frame);
  }, [resolvedTheme, pathname]);

  return null;
}
