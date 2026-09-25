# Polaris for React — v1.0.0

The Polaris design system as typed React components for Next.js (App Router) + TypeScript, with Light and Dark themes. Rebuilt from the *Polaris Styles* and *Polaris Components* community Figma files: 432 color tokens (209 semantic), type, spacing, radius and bevelled shadows; 58 components; 60 icons.

```tsx
import { Page, Layout, Card, IndexTable, Badge, Button } from '@/components/polaris';
```

## Setup (already done if you used /polaris:setup)
1. Styles — Tailwind v4 `globals.css`:
   ```css
   @import "tailwindcss";
   @import "../components/polaris/styles/tokens.css";
   @import "../components/polaris/styles/base.css";
   @import "../components/polaris/styles/components.css" layer(components);
   @import "../components/polaris/styles/tailwind.css";
   @import "../components/polaris/styles/shadcn.css"; /* with shadcn/ui */
   ```
   Without Tailwind: `import '@/components/polaris/styles/polaris.css'` in the root layout.
2. Font — Inter via next/font with `variable: '--font-inter'` on `<html>`.
3. Router links — wrap the app (from a `'use client'` file) in `<PolarisProvider linkComponent={Link}>` with `Link` from `next/link`.
4. Dark mode — `class="dark"` or `data-theme="dark"` on `<html>` (next-themes works with either).

## Rules
- Compose pages from components: `Page` → `Layout` / `Grid` → `Card` → content. Controls are always Polaris components.
- Style only with tokens: `var(--bg-surface)` / Tailwind `bg-(--bg-surface)`, `text-(--text-secondary)`, `rounded-(--radius-300)`, `shadow-(--shadow-100)`; spacing with Tailwind's scale (`p-4` = `space-400`). Semantic tokens only — never primitives (`gray-12`) or Tailwind palette colors. No `dark:` color overrides.
- Type classes: `heading-lg` (page titles), `heading-sm` (card titles), `body-md` (default), `body-sm` (secondary/help), `body-md-numeric` (numbers).
- One primary action per view; destructive = `tone="critical"` + confirmation Modal.
- Sentence case, verb + noun buttons, one- or two-word badges, no emoji.
- Server Components by default: pass serializable props and navigate with `url`; callbacks and state only in small `'use client'` components.

## What's here
| Path | Contents |
|---|---|
| `index.ts` | every export |
| `*.tsx` | one component per file (`'use client'` only where needed) |
| `docs/` | one Markdown doc per component + `docs/README.md` index |
| `styles/` | `tokens.css`, `base.css`, `components.css`, `tailwind.css`, `shadcn.css`, `polaris.css`, `tokens.json` |
| `icons.ts` | the 60 icon glyphs (`IconName` type) |
| `tools/audit.mjs` | `node components/polaris/tools/audit.mjs app components` — flags hard-coded colors, spacing, fonts, raw controls, Title Case, missing labels |

Generated from the design system; change tokens in `styles/tokens.json` + `tokens.css` together, and prefer composing over editing components.
