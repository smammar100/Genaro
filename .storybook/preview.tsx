import * as React from "react";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import type { Decorator, Preview } from "@storybook/nextjs-vite";
import {
  Controls,
  Description,
  Markdown,
  Primary,
  Stories,
  Subtitle,
  Title,
  useOf,
} from "@storybook/addon-docs/blocks";
import { create } from "storybook/theming";
import { GenaroProvider } from "../src/components/genaro";
import "../src/app/globals.css";

// The app's typefaces, loaded the way app/layout.tsx loads them.
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
document.documentElement.classList.add(geistSans.variable, geistMono.variable);

/**
 * Light or dark: Genaro's own token sets, switched by `.dark` on <html> as in
 * the app. Default or compact: the type scale's two steps (`.type-compact`).
 */
const withAppChrome: Decorator = (Story, context) => {
  const dark = context.globals.theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  return (
    <GenaroProvider linkComponent={Link}>
      <div
        className={context.globals.density === "compact" ? "type-compact" : undefined}
        style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-sans)" }}
      >
        <Story />
      </div>
    </GenaroProvider>
  );
};

/** The component's full guidelines (docs/<Component>.md), under its stories. */
function Guidelines() {
  const resolved = useOf("meta");
  const guidelines =
    resolved.type === "meta" ? (resolved.preparedMeta.parameters.guidelines as string | undefined) : undefined;
  return guidelines ? <Markdown>{guidelines}</Markdown> : null;
}

const preview: Preview = {
  decorators: [withAppChrome],
  globalTypes: {
    theme: {
      description: "Genaro theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: "Type scale step",
      toolbar: {
        title: "Type step",
        icon: "paragraph",
        items: [
          { value: "default", title: "Default type" },
          { value: "compact", title: "Compact type" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light", density: "default" },
  parameters: {
    layout: "padded",
    controls: {
      expanded: true,
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: {
      // Report violations in the Accessibility panel without failing stories.
      test: "todo",
    },
    docs: {
      toc: true,
      // Docs pages read in the design system's own typefaces.
      theme: create({
        base: "light",
        fontBase: "var(--font-geist-sans), Geist, sans-serif",
        fontCode: "var(--font-geist-mono), 'Geist Mono', monospace",
      }),
      page: () => (
        <>
          <Title />
          <Subtitle />
          <Description />
          <Primary />
          <Controls />
          <Stories />
          <Guidelines />
        </>
      ),
    },
    options: {
      storySort: {
        order: ["Introduction", "Foundations", "Components", ["Actions", "Layout and structure", "Lists and tables", "Forms", "Feedback and status", "Images and icons", "App chrome and navigation", "Overlays", "App setup"], "Patterns", "Guides"],
      },
    },
  },
};

export default preview;
