"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/** Whether <html> carries the dark theme — false on the server and while hydrating. */
function useIsDark() {
  return React.useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

/**
 * The top bar's light/dark switch. Both themes are Genaro's own token sets
 * (tokens.css declares the dark one under `.dark`); next-themes puts the class
 * on <html> and remembers the choice.
 */
export function ThemeToggle() {
  const { setTheme } = useTheme();
  const dark = useIsDark();
  const label = dark ? "Use light theme" : "Use dark theme";
  return (
    <button
      type="button"
      className="p-topbar__iconbtn"
      aria-label={label}
      title={label}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? (
        <Sun aria-hidden className="size-5 text-(--icon-inverse)" />
      ) : (
        <Moon aria-hidden className="size-5 text-(--icon-inverse)" />
      )}
    </button>
  );
}
