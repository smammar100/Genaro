# Genaro design system — v1.0.0

The Genaro design system as typed React components for Next.js (App Router) + TypeScript, with Light and Dark themes. Built from two community Figma files, one of styles and one of components: 432 color tokens (209 semantic), type, spacing, radius and bevelled shadows; 58 components; 60 icons.

```tsx
import { Page, Layout, Card, IndexTable, Badge, Button } from '@/components/genaro';
```

Every component and token is in Storybook (`pnpm storybook`, port 6006): stories in `stories/`, the generated foundation pages in `stories/foundations/` (`tools/foundations.mjs`), and how to write a story in `stories/WritingStories.mdx`.

## Setup (already done in this app)
1. Styles — Tailwind v4 `globals.css`:
   ```css
   @import "tailwindcss";
   @import "../components/genaro/styles/tokens.css";
   @import "../components/genaro/styles/base.css";
   @import "../components/genaro/styles/components.css" layer(components);
   @import "../components/genaro/styles/tailwind.css";
   @import "../components/genaro/styles/shadcn.css"; /* with shadcn/ui */
   ```
   Without Tailwind: `import '@/components/genaro/styles/genaro.css'` in the root layout.
2. Font — Geist and Geist Mono via next/font with `variable: '--font-geist-sans'` / `'--font-geist-mono'` on `<html>`.
3. Router links — wrap the app (from a `'use client'` file) in `<GenaroProvider linkComponent={Link}>` with `Link` from `next/link`.
4. Dark mode — `class="dark"` or `data-theme="dark"` on `<html>` (next-themes works with either).

## Rules
- Compose pages from components: `Page` → `Layout` / `Grid` → `Card` → content. Controls are always Genaro components.
- Style only with tokens: `var(--bg-surface)` / Tailwind `bg-(--bg-surface)`, `text-(--text-secondary)`, `rounded-(--radius-300)`, `shadow-(--shadow-100)`; spacing with Tailwind's scale (`p-4` = `space-400`). Semantic tokens only — never primitives (`gray-12`) or Tailwind palette colors. No `dark:` color overrides.
- Type classes: `heading-lg` (page titles), `heading-sm` (card titles), `body-md` (default), `body-sm` (secondary/help), `body-md-numeric` (numbers). In this app each class is a role of the Fluid Functionalism type scale (`src/lib/type-scale.ts`, 24px largest); the role tokens `text-display` … `text-micro` work too. Never hard-code a size or line height. Three weights (`--fw-regular` 400, `--fw-medium` 500 for component labels, `--fw-semibold` 550 — the heaviest; no bold until approved), set in Geist (Geist Mono for mono, never Helvetica); no letter-spacing, no uppercase; codes use `font-code`; `.type-compact` puts a dense screen on the compact step.
- One primary action per view; destructive = `tone="critical"` + confirmation Modal.
- Sentence case, verb + noun buttons, one- or two-word badges, no emoji.
- Server Components by default: pass serializable props and navigate with `url`; callbacks and state only in small `'use client'` components.

## What's here
| Path | Contents |
|---|---|
| `index.ts` | every export |
| `*.tsx` | one component per file (`'use client'` only where needed) |
| `docs/` | one Markdown doc per component + `docs/README.md` index |
| `styles/` | `tokens.css`, `base.css`, `components.css`, `tailwind.css`, `shadcn.css`, `genaro.css`, `tokens.json` |
| `icons.ts` | the 60 icon glyphs (`IconName` type) |
| `tools/audit.mjs` | `node components/genaro/tools/audit.mjs app components` — flags hard-coded colors, spacing, fonts, raw controls, Title Case, missing labels |

Generated from the design system; change tokens in `styles/tokens.json` + `tokens.css` together, and prefer composing over editing components.
