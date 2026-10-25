// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Storybook's build output (pnpm build-storybook).
    "storybook-static/**",
  ]),
  {
    rules: {
      // Stray console.log/info never reaches a log drain with a severity —
      // route through `@/lib/logger`. warn/error carry their own level.
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // `const { a: _a, ...rest } = props` is the idiom for stripping props
      // before spreading; an underscore prefix marks the intentional discard.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // @react-pdf/renderer's <Image> is a PDF primitive with no alt prop.
    files: ["src/components/pdf/**"],
    rules: { "jsx-a11y/alt-text": "off" },
  },
  {
    // One-off CLI scripts report to the terminal; console is their output.
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  {
    // Fluid Functionalism's sidebar, vendored as published
    // (github.com/mickadesign/fluid-functionalism). Its patterns predate the
    // React Compiler rules; keep it close to upstream rather than rewrite it.
    files: ["src/components/fluid/**"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/immutability": "off",
    },
  },
  {
    // Every screen takes its UI from the Genaro design system, which Storybook
    // documents. These flag anything that doesn't: warnings while the app
    // migrates area by area, errors once it's done (call 2026-10-25).
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/contexts/**/*.{ts,tsx}"],
    ignores: [
      // The kit itself, and the layers it replaces.
      "src/components/genaro/**",
      "src/components/ui/**",
      "src/components/fluid/**",
      // Printed documents are drawn with @react-pdf, not HTML controls.
      "src/components/pdf/**",
      "**/*.stories.tsx",
      "**/*.test.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/components/ui/*"],
              message: "Use the Genaro component from @/components/genaro instead (see it in Storybook).",
            },
          ],
        },
      ],
      "react/forbid-elements": [
        "warn",
        {
          forbid: [
            { element: "button", message: "Use Button from @/components/genaro (Storybook: Components/Actions/Button)." },
            { element: "input", message: "Use TextField, Checkbox, RadioButton or Switch from @/components/genaro." },
            { element: "select", message: "Use Select or Combobox from @/components/genaro." },
            { element: "textarea", message: "Use TextField with multiline from @/components/genaro." },
            { element: "table", message: "Use IndexTable or DataTable from @/components/genaro." },
          ],
        },
      ],
    },
  },
  ...storybook.configs["flat/recommended"]
]);

export default eslintConfig;
