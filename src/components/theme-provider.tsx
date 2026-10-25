"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Thin wrapper around next-themes, mounted in the root layout. It puts
 * `light` or `dark` on <html>, which switches every Genaro token (tokens.css
 * declares the dark set under `.dark`), and remembers the choice made with
 * the top bar's switch (ThemeToggle).
 */
export function ThemeProvider(
  props: ComponentProps<typeof NextThemesProvider>,
): React.ReactElement {
  return <NextThemesProvider {...props} />;
}
