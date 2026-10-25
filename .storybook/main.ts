import type { StorybookConfig } from "@storybook/nextjs-vite";
import type { Plugin } from "vite";

/**
 * Story JSDoc ends with an `@summary` line for agents (the manifest reads it
 * from the source). Docs pages print descriptions as written, so drop that
 * line from the compiled descriptions people read.
 */
const hideSummaryTags = (): Plugin => ({
  name: "hide-jsdoc-summary",
  enforce: "post",
  transform: {
    // After the docs addon has written the descriptions into the module.
    order: "post",
    handler(code, id) {
      if (!/\.stories\.tsx?$/.test(id.split("?")[0])) return null;
      const next = code.replace(/(?:\\r)?\\n@summary [^"\\]*/g, "");
      return next === code ? null : { code: next, map: null };
    },
  },
});

/**
 * Storybook for the Genaro design system: the components in
 * src/components/genaro, its tokens and the Fluid Functionalism type scale.
 * Stories live in src/components/genaro/stories (see the "Guides/Writing
 * stories" page). The components manifest and the MCP addon expose the same
 * stories and JSDoc to coding agents.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-mcp"],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  features: {
    // Agents read components, props, stories and docs from the manifests.
    componentsManifest: true,
  },
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), hideSummaryTags()],
  }),
  typescript: {
    // Reads prop types and their JSDoc from the components' TypeScript.
    // react-docgen keeps each component's `@import` JSDoc tag, which the
    // manifest uses as the import line agents copy; react-docgen-typescript
    // strips it, and the props come out as complete either way.
    reactDocgen: "react-docgen",
  },
};

export default config;
