@AGENTS.md

## Design system: Polaris
- UI is built with the Polaris design system in `src/components/polaris` (import from `@/components/polaris`). Read `src/components/polaris/README.md` once, and `src/components/polaris/docs/<Component>.md` before using a component.
- Use Polaris components for every control and layout block (Page, Layout, Card, IndexTable, TextField, Button…). Tailwind only for layout glue.
- Style only with tokens: `var(--bg-surface)`, `bg-(--bg-surface)`, `text-(--text-secondary)`, `rounded-(--radius-300)`; spacing via Tailwind's scale (p-4 = space-400). No hex colors, no Tailwind palette colors, no `dark:` color overrides — themes switch via tokens. The one exception is registration-plate yellow (`bg-plate`).
- The dark nav rail is the dark Polaris theme scoped to the rail (`data-theme="dark"`), not hand-picked colors.
- Sentence case, verb + noun buttons, one primary action per page, tone="critical" for destructive actions.
- Pages are Server Components where possible; navigate with `url` props; put callbacks and state in small `'use client'` components.
- Before finishing UI work run `node src/components/polaris/tools/audit.mjs src/app src/components` and fix what it reports.
