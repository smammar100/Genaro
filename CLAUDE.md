@AGENTS.md

## Design system: Polaris
- UI is built with the Polaris design system in `src/components/polaris` (import from `@/components/polaris`). Read `src/components/polaris/README.md` once, and `src/components/polaris/docs/<Component>.md` before using a component.
- Use Polaris components for every control and layout block (Page, Layout, Card, IndexTable, TextField, Button…). Tailwind only for layout glue.
- Style only with tokens: `var(--bg-surface)`, `bg-(--bg-surface)`, `text-(--text-secondary)`, `rounded-(--radius-300)`; spacing via Tailwind's scale (p-4 = space-400). No hex colors, no Tailwind palette colors, no `dark:` color overrides — themes switch via tokens. The one exception is registration-plate yellow (`bg-plate`).
- Type follows the Fluid Functionalism scale (`src/lib/type-scale.ts`): six roles, each one size and one line height — display 24/30, title 16/22, subtitle 14/20, body 13/20, caption 12/16, micro 11/14. 24px is the largest size anywhere. Set text with a Polaris type class (`heading-lg` = display, `heading-sm`/`heading-md` = subtitle, `body-md` = body, `body-sm` = caption, `body-xs` = micro) or a role token (`text-display` … `text-micro`). No hard-coded type: no `text-xs`/`text-sm`/`text-[13px]`, no `leading-*` beside a role, no px font sizes in CSS (use `var(--fs-*)`/`var(--lh-*)`). Page titles and big figures are display; dialog and drawer titles title; card titles subtitle; control labels and body copy body; descriptions, badges, errors and table headers caption; counters and keyboard keys micro. Exceptions: reg plates, avatar initials, printed PDFs.
- The dark nav rail is the dark Polaris theme scoped to the rail (`data-theme="dark"`), not hand-picked colors.
- Sentence case, verb + noun buttons, one primary action per page, tone="critical" for destructive actions.
- Pages are Server Components where possible; navigate with `url` props; put callbacks and state in small `'use client'` components.
- Before finishing UI work run `node src/components/polaris/tools/audit.mjs src/app src/components` and fix what it reports.
