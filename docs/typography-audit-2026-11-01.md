# Typography audit, 1 November 2026

> **Superseded:** this is the before state. The type change on the same day moved the app to five sizes and one typeface. See [typography-before-after-2026-11-01.md](typography-before-after-2026-11-01.md).

What the app actually renders, measured on the production build, checked against the type rules in `CLAUDE.md` (six roles, three weights, Geist and Geist Mono, two text colours, no letter-spacing or uppercase).

## How it was measured

- **Rendered pass.** A script read the computed `font-size`, `line-height`, `font-weight`, `font-family`, `text-transform`, `letter-spacing` and colour of every visible text element. It ran on 36 pages and 75 states: every page, every tab on pages that have tabs (Vehicle page ×9, Settings ×7, Invoicing ×7, Vendors ×2), the board and list views of the pipeline, six dialogs (Create lead, Book appointment, Move vehicle, New event, Import sheet, plus the master sheet filter) and two menus (deal split button, top bar user menu). Each piece of text is tagged with the section it sits in (top bar, nav rail, page header, the card by its title, table, dialog) and the component that drew it.
- **Counting.** 9,974 text elements measured. With repeats removed (the shell on every page, the same header on every tab), that leaves **4,071 unique text items**, and those are the counts below.
- **Static pass.** 518 source files scanned for type classes, raw sizes, weights, `leading-*`, `tracking-*` and `uppercase`, so each problem can be traced to a line.
- **Not covered.** `/advert/listings`, `/set-password` and `/join/[token]` (both need an invite link), `/prototype`, and the redirect-only routes. Weights set through `font-variation-settings` don't show up as computed `font-weight`; this only happens in the nav rail (see finding 10). Dark mode wasn't measured separately because themes swap colours, not type.

## Headline numbers

### Font sizes: 9 rendered

| Size | Role | Unique items | Where |
|---|---|---|---|
| 24px | display | 64 | Page titles, dashboard greeting, KPI and invoice figures, auth headings |
| 16px | title | 15 | Dialog titles, empty-state headings |
| 14px | subtitle | 132 | Card titles, settings section titles, top-bar logo, cost-summary figures |
| 13px | body | 1,789 | Body text, control labels, buttons, tabs, inputs, table cells |
| 12px | caption | 1,434 | Descriptions, badges, table headers, meta lines (380 of these are compact body in the master sheet) |
| 11px | micro | 444 | Counters, keyboard keys, reg plates (285), compact captions (112) |
| 10px | compact micro | 186 | Compact plates in the master sheet (25), **report chart axes (161, off the scale)** |
| 9px | none | 6 | Avatar initials (top bar, users list), an allowed exception |
| 7px | none | 1 | Avatar initials (inspection queue), an allowed exception but too small |

The six roles are all in use and **24px is the largest size anywhere**. The compact title (15/20) and compact subtitle (13/18) are defined but nothing renders them. Only one use of a size breaks the rules: 10px chart labels outside the compact sheet.

### Font weights: 3 rendered

| Weight | Unique items | Share | Used for |
|---|---|---|---|
| 400 regular | 2,845 | 70% | Text, labels, table cells, inputs |
| 500 medium | 412 | 10% | Buttons, tabs, badges, pagination, page secondary actions |
| 550 semibold | 814 | 20% | Page, card and dialog titles, big figures, names in rows, selected tabs, reg plates, counters |

Nothing on screen is bolder than 550, and no page uses bold. The one other weight is the Next.js default 404 page, which draws its "404" at 500 in `system-ui` (finding 7).

### Line heights

20 (2,041), 16 (1,047), 14 (438), 18 (380, compact), 30 (116), 12 (25, compact), 22 (15). Each role renders its own line height except in one place: **53 single-line inputs use a 30px line height**, the height of the control rather than of their role (finding 1). Avatars use `line-height: 1`, and the 404 page uses 49.

### Typefaces

Geist 3,757 (92%) and Geist Mono 312 (8%, every one a reg plate). `system-ui` appears twice, both on the default 404 page. No Helvetica or Inter appears anywhere on screen, in emails or in PDFs (emails start their stack with Geist, and PDFs register Geist).

### Size × weight combinations

| Size | 400 | 500 | 550 |
|---|---|---|---|
| 24 | — | 1 (404 page) | 63 |
| 16 | — | — | 15 |
| 14 | 1 (404 page) | — | 131 |
| 13 | 1,356 | 204 | 229 |
| 12 | 818 + 377 compact | 194 + 3 compact | 42 |
| 11 | 14 + 118 compact | 10 | 302 (285 plates) |
| 10 | 161 (charts) | — | 25 (compact plates) |
| 9 / 7 | — | — | 7 (avatars) |

That is 21 size/weight pairs in total. Without the 404 page, the avatar exception and the chart labels, 17 remain, and all of them are combinations the rules allow.

### Letter-spacing, case, colour

- **Letter-spacing:** none rendered anywhere. **Uppercase:** none rendered. **Capitalize:** 3 places (finding 8).
- **Colour:** `--text` 2,203 (54%) and `--text-secondary` 1,201 (30%). The rest are status tones (critical 153, mostly required-field asterisks; success 26; caution 17; info 16), links 26, plate ink 312, white on primary buttons 49, disabled 9 and the dark top bar 3. Off the rules: **idle tabs use a third grey, `--text-brand`** (49 items, finding 5), and the invoice form uses **a second red for its asterisks** (finding 6).

## Role check

| Rule | Expected | Measured | Verdict |
|---|---|---|---|
| Page titles (`p-page__title`) | 24/30 · 550 | 29 of 29 | ✅ |
| Big figures (KPI tiles, invoice totals) | 24/30 · 550 | KPI and invoicing ✅ · add-vehicle cost summary at 14/20 · reports card totals at 12/16 | ⚠️ inconsistent |
| Dialog titles (`p-modal__title`) | 16/22 · 550 | 5 of 5 | ✅ |
| Empty-state headings | 16/22 · 550 | 10 of 10 | ✅ |
| Card titles (`p-card__title`, app card `h2`) | 14/20 · 550 | 58 of 58, plus 29 app headings | ✅ |
| Body copy and control labels | 13/20 · 400 | 270 of 301 labels (2 more are compact 12/18) | ⚠️ 29 labels at 12/16 (finding 4) |
| Buttons (`p-btn__label`) | 13/20 · 500 | 143 of 143 (compact 12/18 in the master sheet) | ✅ |
| Tabs (`p-tab`) | 13/20 · 500, selected 550 | 49 idle at 500, 25 selected at 550 | ✅ size and weight · ⚠️ colour |
| Badges (`p-badge`) | 12/16 · 500 | 192 of 192 | ✅ |
| Table headers (IndexTable, DataTable, `th`) | 12/16 · 400 | All | ✅ |
| Descriptions (page subtitles, annotations, help) | 12/16 · 400 | Page subtitles 27 of 27 ✅ · `p-labelled__help` at 13/20 | ⚠️ finding 3 |
| Counters, keyboard keys | 11/14 | Tab badges, nav counts, step numbers, ⌘K | ✅ |
| Micro used only for counters and keys | — | 7 places use micro for sentences or labels | ❌ finding 2 |
| Names in a row, selected items | 550 | IndexTable names, deal customer links, selected tabs, active nav row | ✅ |
| Reg plates | Plate face, any size | Geist Mono 550 at 4 sizes (10, 11, 12, 14) | ✅ exception |

## Findings, most important first

### 1. Inputs use their control height as line height (53 inputs)

- **What renders:** 13/30, 12/30 and 11/30 instead of 13/20, 12/16 and 11/14.
- **Source:** `inputControlClassName` in [input-styles.ts](src/components/ui/input-styles.ts:24) sets `leading-7.5`, with `leading-6.5`, `leading-8.5`, `leading-10` and `leading-11` for the other sizes and touch.
- **Where:**
  - Add vehicle: 23 inputs, plus the date fields.
  - Master sheet: the inline new-row inputs.
  - Search boxes on Activity log, Invoicing and Completed sales.
  - The vehicle Inspection tab.
  - Combobox and date inputs in the Create lead, Book appointment and New event dialogs.
- **Effect:** Single-line text looks the same either way, but this is the only `leading-*` next to a role in the app, and it comes from the legacy `ui/*` layer.
- **Fix:** Move these fields to Genaro `TextField`, `Combobox` and `DatePicker` (`.p-field__input` renders 13/20 correctly), or centre the text with padding and drop the `leading-*`.

### 2. Micro (11px) used for words, not counters (7 places)

| Text | Where | Source |
|---|---|---|
| "All day" | Week view in Master calendar, Maintenance calendar and Appointments | [time-grid.tsx:113](src/components/calendar/time-grid.tsx:113) |
| "3 days" | Deal page stage path (days in stage) | [stage-path.tsx:48](src/components/sales/stage-path.tsx:48) |
| "Waiting for someone to pick it up", "Prep work under way", "All items done" | Prep and repair lane descriptions | [kanban-board.tsx:187](src/components/kanban/kanban-board.tsx:187), the lane summary |
| "In progress" | Prep and repair, a choice label on a card | `body-xs` on a Genaro choice |
| "Drop a deal on a column to move it there…" | Hidden-columns rail on every board | [kanban-board.tsx:525](src/components/kanban/kanban-board.tsx:525) |
| "Fri" | Dashboard Appointments date tile | `text-micro font-semibold`, borderline: a date label inside a tile |

- **Fix:** Use caption (`body-sm`, 12/16) for all of these. The date-tile weekday can stay micro if you count it as a counter.

### 3. Genaro help text is body size, not caption

- **What renders:** `.p-labelled__help` and `.p-choice__help` set only a colour ([components.css:170](src/components/genaro/styles/components.css:170)), so they inherit 13/20.
- **Where:** Six help lines on Settings, such as "Up to 4 characters." and "Drives the visible range on the Appointments…", plus "Current" in the Move dialog.
- **The rule:** Descriptions are caption.
- **Fix:** Add `font-size: var(--fs-caption); line-height: var(--lh-caption)` to that rule. It's a one-line Genaro change and every field picks it up.

### 4. Control labels at caption (29 labels)

- **What renders:** 12/16 labels where control labels should be body (13/20).
- **Where:**
  - Add vehicle, Purchase costs card: "Buying price", "BCA buyer's fee", "BCA essential check"… (`text-caption font-normal` on a `<label>`).
  - Reports filters: "Year", "Make", "Model" (legacy `@/components/ui/label`).
  - Generate invoice, Sale details line items ("Description", "Unit £") and the Pre-delivery check list.
- **Fix:** Use body for each, or switch to Genaro `Labelled`/`TextField` labels, which already render 13/20.

### 5. Idle tabs use a third text colour

- **What renders:** `.p-tab` is `color: var(--text-brand)` ([components.css:489](src/components/genaro/styles/components.css:489)), which resolves to rgb(74, 74, 74). It sits between `--text` (48) and `--text-secondary` (97).
- **Where:** Every tab strip: Invoicing, Settings, Master sheet, Vehicle page, Vendors.
- **The rule:** Two text colours.
- **Fix:** Use `--text-secondary` for idle tabs (selected tabs already turn `--text` and 550). The idle-to-selected change gets stronger as a result. This is a Genaro decision, so it's your call.

### 6. Two reds for required asterisks

- **What renders:** Every form draws `*` in `--text-critical` rgb(142, 31, 11), except Generate invoice, which uses the shadcn `text-destructive` rgb(229, 28, 0).
- **Source:** [invoice-generation/page.tsx:762](src/app/(dashboard)/sales/invoice-generation/page.tsx:762), 789, 799 and 850.
- **Fix:** Use `text-(--text-critical)`.

### 7. No app 404 page, so the Next default renders in system-ui

- **What renders:** `/advert/photo-processing` (a hidden feature) and any mistyped URL show Next's built-in page: `system-ui`, "404" at 24/49 weight 500, body at 14/49.
- **Source:** There's no `src/app/not-found.tsx`.
- **Fix:** Add one built from Genaro `Page` and `EmptyState`.

### 8. `capitalize` makes Title Case where the rule is sentence case (3 rendered, 7 in code)

- **What renders:**
  - "2020 · 70,624 mi · Automatic · Petrol" (advert live preview, [advert-preview.tsx:100](src/components/advert/advert-preview.tsx:100)).
  - "Auction / Bca" (vehicle Financials, [financials-tab.tsx:333](src/components/vehicle-detail/financials-tab.tsx:333) and 344).
  - "Inspection" (Things to do, [cells.tsx:227](src/components/data-grid/cells.tsx:227)).
- **Also in code:** `appointments-tab.tsx:261` and 264 and `listing-tab.tsx:111` and 115.
- **Fix:** Format the value in code, as [primitives.tsx:47](src/components/vehicle-detail/primitives.tsx:47) already does (`first-letter:uppercase` gives sentence case), and keep acronyms like BCA upper.

### 9. Report charts draw axis labels at 10px

- **What renders:** 161 axis and legend labels on Reports ("£0 / £50k", "0 sold", "0%") use `text-[length:var(--fs-micro-compact)]`.
- **Source:** [simple-charts.tsx](src/components/charts/simple-charts.tsx:123) lines 123, 147 and 264.
- **Status:** The file documents this as an exception (GEN-57, SVG labels), but `CLAUDE.md`'s exception list doesn't include charts. The charts also colour with shadcn tokens (`fill-muted-foreground`, `text-foreground`).
- **Fix:** Decide whether to move to micro (11px) or add "chart axes" to the exceptions in `CLAUDE.md`.

### 10. Weights set outside the weight classes

- **Nav rail:** The rail sets its active-row weight with inline `fontVariationSettings: 'wght' 550` ([sidebar-menu.tsx:825](src/components/fluid/sidebar-menu.tsx:825), 1182 and 813, and [sidebar-core.tsx:1033](src/components/fluid/sidebar-core.tsx:1033)). It renders correctly (active row 550, others 400), but it is a raw weight outside `font-medium`/`font-semibold`, and computed-style tools see 400. It's there to animate the weight, so this is a note, not a fix.
- **Invite email:** The email uses `font-weight:600` (heavier than 550) in 4 places, plus an uppercase, `letter-spacing:0.06em` eyebrow, "Your roles" ([invite-email.ts:52](src/lib/email/templates/invite-email.ts:52)). The credentials email uses 600 three times. Both break the weight, uppercase and eyebrow rules. Use 550 and sentence case.

### 11. Avatar initials sizes are inverted

- **What renders:** `.p-avatar--xs` (20px) draws initials at **8px**, but the larger `.p-avatar--sm` (24px) draws them at **7px** ([components.css:262](src/components/genaro/styles/components.css:262) and 263). md is 9px, lg 10px, xl 13px.
- **Where:** The 7px initials render on the Inspection queue.
- **Fix:** Initials are an allowed exception, but sm should be at least xs. Swap them to 7 → 8 and 8 → 9, or step them 8 / 9 / 10 / 11 / 13.

### 12. Dead letter-spacing on reg plates

- **What renders:** No plate gets letter-spacing.
- **Source:** [genaro-bridge.css:47](src/app/genaro-bridge.css:47) resets `letter-spacing` on every `.uppercase` element. `RegPlate` carries `uppercase`, so its `tracking-[0.08em]`, `[0.1em]` and `[0.12em]` ([reg-plate.tsx:16](src/components/shared/reg-plate.tsx:16), 18 and 19) and the calendar event card's `tracking-[0.04em]` ([event-card.tsx:95](src/components/calendar/event-card.tsx:95)) never apply.
- **Fix:** Remove the tracking classes, or exempt plates in the bridge if you want plate spacing back.
- **Also:** One tracking class is still live: `tracking-wider` on a mono icon tile in [overview-tab.tsx:421](src/components/vehicle-detail/overview-tab.tsx:421). It wasn't on screen for the car measured, but it breaks the no-letter-spacing rule.

### 13. Smaller inconsistencies

- **Key/value labels three ways:**
  - Genaro `DescriptionList` terms are semibold, 13/20 · 550 ([components.css:669](src/components/genaro/styles/components.css:669)), on the deal page Customer card.
  - Add vehicle's summary uses regular `dt` at 13/20 · 400.
  - The deal page figures strip uses 12/16 · 400 ("Price", "Offer").
  - The rule puts semibold on headings, names and selected items, which suggests the DescriptionList term should be regular and the value (when it's a name) semibold.
- **Sub-headings under card level have no role:**
  - Activity log day headers ("Yesterday") are 13/20 · 550.
  - Add vehicle's "Costs" and "Selling" are 12/16 · 550.
  - Settings annotation titles are 14/20 · 550.
- **Figures:** Invoicing totals are display (24) and KPI tiles display, but Add vehicle's Cost summary values are 14/20 · 550 and the Reports card-header totals ("£2,834,206.75") are 12/16 · 400.
- **Doc drift:** [type-scale.ts](src/lib/type-scale.ts:72) still says display is 28/34 and uses `34px` as its line-height fallback. The tokens ship 24/30.
- **Uppercase reg input:** The Dashboard welcome reg input ([dashboard-welcome.tsx:106](src/components/dashboard/dashboard-welcome.tsx:106)) carries `uppercase`. The bridge resets it to `none`, so the class does nothing; the `onChange` already uppercases the value (line 100). The class can go.
- **PDFs:** The job card and warranty certificate section headings use `textTransform: "uppercase"` with `letterSpacing: 0.5`. PDFs are exempt from the size rules, but the no-uppercase rule isn't stated for them, so it's your call.

## What's clean

- 0 Tailwind palette sizes (`text-sm` and so on) in app code. The five in `globals.css` are the remap to roles.
- 0 `font-bold`, `font-[…]` or raw `font-weight` in app CSS or classes (outside emails and the nav rail's variation settings).
- 0 px font sizes in app CSS except avatar initials. The one `text-[16px]` is the deliberate touch-input zoom guard ([type-scale.ts:100](src/lib/type-scale.ts:100)).
- Every Genaro component renders its role: Page, Card, Modal, Badge, Button, Tabs, IndexTable, DataTable, EmptyState, Layout annotations, Pagination, KeyboardKey and TopBar.
- Static class counts: `body-sm` 168, `text-caption` 168, `text-body` 130, `body-md` 126, `body-md-semibold` 34, `heading-sm` 27, `text-subtitle` 21, `heading-lg` 20, `body-sm-semibold` 19, `text-micro` 17, `body-xs` 12, `heading-md` 11, `body-xs-semibold` 10, `text-display` 9, `text-title` 5. Weights: `font-semibold` 63, `font-normal` 7, `font-medium` 1.
- Still on the legacy layer: 76 files import `@/components/ui/*` (input 36, skeleton 20, label 20, button 19, select 12, dialog 11, textarea 10…). Findings 1, 4, 6 and 9 all come from it.

## Per page

Unique text items per page, excluding the top bar and nav rail (measured once, below). "States" counts tabs and views on that page.

| Page | States measured | Text items | Sizes (px) | Weights | Distinct styles |
|---|---|---|---|---|---|
| Activity log | 2 | 172 | 24, 13, 12 | 550, 500, 400 | 6 |
| Add vehicle | 1 | 156 | 24, 14, 13, 12, 11 | 550, 500, 400 | 10 |
| Advert performance | 1 | 5 | 24, 16, 13, 12 | 550, 500, 400 | 5 |
| Advert work list | 1 | 13 | 24, 16, 13, 12 | 550, 500, 400 | 5 |
| Advertisers | 1 | 16 | 24, 13, 12 | 550, 500, 400 | 5 |
| All vehicles | 2 | 208 | 24, 13, 12, 11 | 550, 500, 400 | 9 |
| Appointments | 2 | 35 | 24, 14, 13, 12 | 550, 500, 400 | 5 |
| Claims | 1 | 26 | 24, 16, 13, 12, 11 | 550, 500, 400 | 8 |
| Completed sales | 1 | 54 | 24, 13, 12, 11 | 550, 500, 400 | 9 |
| Dashboard | 1 | 73 | 24, 14, 13, 12, 11 | 550, 500, 400 | 9 |
| Deal page | 1 | 54 | 24, 14, 13, 12, 11 | 550, 500, 400 | 9 |
| Dealer partner | 1 | 24 | 24, 14, 13, 12 | 550, 500, 400 | 6 |
| External warranties | 1 | 24 | 24, 16, 13, 12, 11 | 550, 500, 400 | 8 |
| Forgot password | 1 | 7 | 24, 13, 12 | 550, 500, 400 | 4 |
| Generate invoice | 1 | 113 | 24, 14, 13, 12 | 550, 500, 400 | 7 |
| In-house warranties | 2 | 38 | 24, 13, 12, 11 | 550, 500, 400 | 9 |
| Inspection queue | 1 | 647 | 24, 13, 12, 11, 7 | 550, 500, 400 | 10 |
| Invoicing | 8 | 66 | 24, 16, 14, 13, 12, 11 | 550, 500, 400 | 10 |
| Log in | 1 | 8 | 24, 13, 12 | 550, 500, 400 | 4 |
| Maintenance calendar | 1 | 26 | 24, 14, 13, 12, 11 | 550, 500, 400 | 5 |
| Maintenance job | 1 | 27 | 24, 14, 13, 12 | 550, 500, 400 | 7 |
| Maintenance pipeline | 1 | 36 | 24, 13, 12, 11 | 550, 500, 400 | 7 |
| Master calendar | 1 | 42 | 24, 14, 13, 12, 11 | 550, 500, 400 | 6 |
| Master sheet | 1 | 537 | 24, 13, 12, 11, 10 | 550, 500, 400 | 11 |
| Photo processing (404) | 1 | 2 | 24, 14 | 500, 400 | 2 |
| Prep and repair | 1 | 20 | 24, 13, 12, 11 | 550, 500, 400 | 8 |
| Reports | 2 | 297 | 24, 14, 13, 12, 10 | 550, 500, 400 | 8 |
| Reset password | 1 | 6 | 24, 13, 12 | 550, 500, 400 | 4 |
| Returns and cancellations | 1 | 3 | 24, 13, 12 | 550, 500, 400 | 3 |
| Sales pipeline | 3 | 158 | 24, 13, 12, 11 | 550, 500, 400 | 7 |
| Settings | 8 | 240 | 24, 14, 13, 12 | 550, 500, 400 | 7 |
| Users and permissions | 2 | 73 | 24, 13, 12, 9 | 550, 500, 400 | 6 |
| Vehicle advert | 1 | 176 | 14, 13, 12, 11 | 550, 500, 400 | 7 |
| Vehicle page | 9 | 521 | 24, 16, 14, 13, 12, 11 | 550, 500, 400 | 15 |
| Vendors | 2 | 74 | 24, 13, 12 | 550, 500, 400 | 6 |
| Workshop | 1 | 5 | 24, 16, 13, 12 | 550, 500, 400 | 5 |
| Overlay: book appointment | 1 | 19 | 16, 13 | 550, 500, 400 | 4 |
| Overlay: create lead | 1 | 16 | 16, 13 | 550, 500, 400 | 4 |
| Overlay: deal split button | 1 | 2 | 13 | 400 | 1 |
| Overlay: import sheet | 1 | 8 | 16, 13, 12 | 550, 500, 400 | 5 |
| Overlay: master sheet filter open | 1 | 3 | 13, 12 | 400 | 2 |
| Overlay: move vehicle | 1 | 15 | 16, 13 | 550, 500, 400 | 4 |
| Overlay: new event | 1 | 18 | 16, 13 | 550, 500, 400 | 4 |
| Overlay: topbar user | 1 | 6 | 13, 12 | 550, 400 | 2 |


### Shell: top bar and nav rail (every page)

| Section | Component | Style | Example |
|---|---|---|---|
| Top bar | `p-topbar__logo` | 14/20 550 | Car Capital UK |
| Top bar | `p-topbar__input` | 13/20 400 | Search vehicles and pages |
| Top bar | `p-kbd` | 11/14 400 | ⌘K |
| Top bar | `p-topbar__username` | 13/20 400 | Abbas Jaffery |
| Top bar | `p-avatar__initials` | 9/9 550 | AJ |
| Nav rail | `p-btn__label` | 13/20 500 | Add vehicle |
| Nav rail | `sidebar:menu-button` | 13/20 400 | Dashboard / Inventory / Maintenance |


## Appendix: every section of every page

One row per component and style in each section, with how many unique text items use it and an example. A card in parentheses has no title; it is named by its first text, often a table column header. `span/div`, `p`, `label` and `input` mean app markup rather than a Genaro component. Styles read size/line-height weight, then `mono` for Geist Mono or `compact` for the master sheet scale.

### Activity log

172 text items · 3 sizes (24, 13, 12) · 3 weights (550, 500, 400). States: admin-activity, admin-activity-first.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Activity log |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | A company-wide audit trail of every acti |
| Page body | `p-labelled__label` | 13/20 400 | 2 | Action / User |
| Page body | `input` | 12/30 400 | 1 | Search description, reg, user… |
| Form controls | `p-select__value` | 13/20 400 | 3 | Any date / Any action |
| Form controls | `p-select__inline-label` | 13/20 400 | 1 | Activity |
| Card: Yesterday | `span/div` | 13/20 400 | 93 | Data backup downloaded (1130 rows across / PX07 YYL: forecourt → staff |
| Card: Yesterday | `a` | 12/16 400 | 57 | PX07 YYL / LY63 YPK |
| Card: Yesterday | `span/div` | 12/16 400 | 10 | Data backup created · Ali Raza Jafri / 18 hours ago |
| Card: Yesterday | `h2` | 13/20 550 | 2 | Yesterday / 2 days ago |
| Card: Yesterday | `p-btn__label` | 13/20 500 | 1 | Load older activity |

### Add vehicle

156 text items · 5 sizes (24, 14, 13, 12, 11) · 3 weights (550, 500, 400). States: add-vehicle.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Add vehicle |
| Page header | `p-page__secondary` | 13/20 500 | 1 | Save as draft |
| Page header | `p-btn__label` | 13/20 500 | 1 | Save vehicle |
| Page body | `span/div` | 11/14 550 | 5 | 1 / 2 |
| Page body | `span/div` | 12/16 400 | 5 | Reg and specs / Seller and invoice |
| Page body | `span/div` | 13/20 400 | 4 | Buying / Purchase costs |
| Page body | `span/div` | 13/20 550 | 1 | Vehicle identity |
| Card: Start with the registration | `p` | 12/16 400 | 2 | We check your stock book and fill make,  / No registration yet? Leave it blank and  |
| Card: Start with the registration | `p-card__title` | 14/20 550 | 1 | Start with the registration |
| Card: Start with the registration | `p-badge` | 12/16 500 | 1 | Received |
| Card: Start with the registration | `label` | 13/20 400 | 1 | Registration |
| Card: Start with the registration | `span/div` | 13/20 400 | 1 | * |
| Card: Start with the registration | `input` | 13/30 400 | 1 | GK66 6NX |
| Card: Start with the registration | `p-btn__label` | 13/20 500 | 1 | Look up |
| Card: Vehicle identity | `label` | 13/20 400 | 10 | Mileage / Make |
| Card: Vehicle identity | `p-labelled__label` | 13/20 400 | 4 | Vehicle type / Body type |
| Card: Vehicle identity | `input` | 13/30 400 | 3 | e.g. LX 35H / From the BCA invoice, e.g. 1.5 SE |
| Card: Vehicle identity | `p-card__title` | 14/20 550 | 1 | Vehicle identity |
| Card: Vehicle identity | `p` | 12/16 400 | 1 | Auto-filled from DVLA + AutoTrader |
| Card: Vehicle identity | `span/div` | 13/20 400 | 1 | * |
| Card: Vehicle identity | `p-popover` | 13/30 400 | 1 | YYYY-MM-DD |
| Form controls | `p-select__value` | 13/20 400 | 8 | CAR / Hatchback |
| Card: Compliance and verification | `label` | 13/20 400 | 6 | Registration date / CO₂ (g/km) |
| Card: Compliance and verification | `span/div` | 13/20 400 | 2 | Tax / MOT |
| Card: Compliance and verification | `span/div` | 12/16 400 | 2 | No due date / No expiry on file |
| Card: Compliance and verification | `p-card__title` | 14/20 550 | 1 | Compliance and verification |
| Card: Compliance and verification | `p-btn__label` | 13/20 500 | 1 | Re-fetch |
| Card: Compliance and verification | `p-badge` | 12/16 500 | 1 | — |
| Card: Compliance and verification | `p-popover` | 13/30 400 | 1 | YYYY-MM-DD |
| Card: Compliance and verification | `p` | 12/16 400 | 1 | Enter a registration above and click Loo |
| Card: Buying | `label` | 13/20 400 | 7 | Seller name / Seller phone |
| Card: Buying | `p-popover` | 13/30 400 | 4 | e.g. BCA AUCTION, SOR, PARTEX / BCA, CAR CAPITAL, INFINIT… |
| Card: Buying | `p-labelled__label` | 13/20 400 | 3 | Source type / Local or import |
| Card: Buying | `p-card__title` | 14/20 550 | 1 | Buying |
| Card: Buying | `p` | 12/16 400 | 1 | Where the car came from and who owns it |
| Card: Buying | `span/div` | 13/20 400 | 1 | * |
| Card: Buying | `input` | 13/30 400 | 1 | Name of the owner |
| Card: Purchase costs | `label` | 12/16 400 | 9 | Buying price / BCA buyer's fee |
| Card: Purchase costs | `th` | 12/16 400 | 3 | Cost item / Amount £ |
| Card: Purchase costs | `span/div` | 12/16 400 | 2 | * / — |
| Card: Purchase costs | `td` | 13/20 550 | 2 | Total buying price / £0.00 |
| Card: Purchase costs | `p-card__title` | 14/20 550 | 1 | Purchase costs |
| Card: Purchase costs | `p` | 12/16 400 | 1 | Enter the VAT actually paid on each line |
| Card: Purchase costs | `p-btn__label` | 13/20 500 | 1 | +20% |
| Card: Purchase costs | `td` | 13/20 400 | 1 | Not part of the total buying price on th |
| Card: Receiving | `label` | 13/20 400 | 12 | Vehicle receiving date / Received by |
| Card: Receiving | `input` | 13/30 400 | 3 | Abbas Jaffery / e.g. EURO 6 |
| Card: Receiving | `p-popover` | 13/30 400 | 2 | 2026-11-01 / AVAILABLE, NOT AVAILABLE… |
| Card: Receiving | `p-card__title` | 14/20 550 | 1 | Receiving |
| Card: Receiving | `p` | 12/16 400 | 1 | When the car arrived, and what came with |
| Card: Receiving | `span/div` | 13/20 400 | 1 | * |
| Card: Receiving | `p-labelled__label` | 13/20 400 | 1 | Service history |
| Card: Receiving | `p-choice__label` | 13/20 400 | 1 | Lock nut |
| Card: Things to do | `p-labelled__label` | 13/20 400 | 2 | Description / Cost £ |
| Card: Things to do | `p-field__input` | 13/20 400 | 2 | e.g. Service, MOT, valet / 0 |
| Card: Things to do | `p-card__title` | 14/20 550 | 1 | Things to do |
| Card: Things to do | `p` | 12/16 400 | 1 | Prep work and its cost. The costs add up |
| Card: Things to do | `p-btn__label` | 13/20 500 | 1 | Add item |
| Card: Pricing | `label` | 13/20 400 | 3 | Warranty cost £ / Minimum sale price £ |
| Card: Pricing | `p-card__title` | 14/20 550 | 1 | Pricing |
| Card: Pricing | `p` | 12/16 400 | 1 | Optional, can set later |
| Card: Cost summary | `dt` | 13/20 400 | 6 | Buying price / Fees and charges |
| Card: Cost summary | `h3` | 12/16 550 | 2 | Costs / Selling |
| Card: Cost summary | `dd` | 13/20 400 | 2 | £0.00 / Not set |
| Card: Cost summary | `span/div` | 14/20 550 | 2 | Base cost / £0.00 |
| Card: Cost summary | `p-card__title` | 14/20 550 | 1 | Cost summary |
| Card: Cost summary | `p` | 12/16 400 | 1 | Add a listing price to see profit |

### Advert performance

5 text items · 4 sizes (24, 16, 13, 12) · 3 weights (550, 500, 400). States: advert-performance.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Performance |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | How your adverts are doing across every  |
| Card: No live listings yet | `p-empty__heading` | 16/22 550 | 1 | No live listings yet |
| Card: No live listings yet | `p-empty__body` | 13/20 400 | 1 | Publish a vehicle from the work list to  |
| Card: No live listings yet | `p-btn__label` | 13/20 500 | 1 | Open work list |

### Advert work list

13 text items · 4 sizes (24, 16, 13, 12) · 3 weights (550, 500, 400). States: advert-work-list.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Work list |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Vehicles ready to advertise. Build each  |
| Page header | `p-btn__label` | 13/20 500 | 1 | Create listing |
| Card: No listings yet | `p-labelled__label` | 13/20 400 | 3 | Search listings by registration, stock I / Status |
| Card: No listings yet | `p-field__input` | 13/20 400 | 1 | Search by reg, stock or title… |
| Card: No listings yet | `p-empty__heading` | 16/22 550 | 1 | No listings yet |
| Card: No listings yet | `p-empty__body` | 13/20 400 | 1 | Mark a vehicle as ready, then create a l |
| Form controls | `p-select__value` | 13/20 400 | 2 | All statuses / All channels |
| Card: No listing selected | `p-empty__heading` | 16/22 550 | 1 | No listing selected |
| Card: No listing selected | `p-empty__body` | 13/20 400 | 1 | Select a listing to preview its advert. |

### Advertisers

16 text items · 3 sizes (24, 13, 12) · 3 weights (550, 500, 400). States: admin-advertisers.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Advertisers |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Dealers configured on our AutoTrader Con |
| Page header | `p-btn__label` | 13/20 500 | 1 | Sync now |
| Card: (Advertiser ID) | `p-datatable` | 12/16 400 | 9 | Advertiser ID / Name |
| Card: (Advertiser ID) | `p-datatable` | 13/20 400 | 2 | Dealer 527671 / M15 4FN |
| Card: (Advertiser ID) | `p-badge` | 12/16 500 | 1 | Good |
| Page body | `span/div` | 13/20 400 | 1 | 1 advertiser · page 1 of 1 |

### All vehicles

208 text items · 4 sizes (24, 13, 12, 11) · 3 weights (550, 500, 400). States: vehicles, vehicles-garage-tab.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | All vehicles |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Every car still for sale, including thos |
| Page header | `p-page__secondary` | 13/20 500 | 1 | Master sheet |
| Page header | `p-btn__label` | 13/20 500 | 1 | Add vehicle |
| Tabs | `p-tab` | 13/20 500 | 6 | Forecourt / Yard |
| Tabs | `p-tab__badge` | 11/14 500 | 6 | 107 / 8 |
| Tabs | `p-tab` | 13/20 550 | 2 | All / Garage |
| Tabs | `p-tab__badge` | 11/14 550 | 2 | 120 / 2 |
| Page body | `p` | 12/16 400 | 2 | 120 of 120 vehicle s / 2 of 120 vehicle s |
| Page body | `p-labelled__label` | 13/20 400 | 1 | Search vehicles |
| Page body | `p-field__input` | 13/20 400 | 1 | Search by reg, stock ID, make or model |
| Card: (Registration) | `p-indextable__row--clickable` | 13/20 400 | 87 | BMW / 3 Series |
| Card: (Registration) | `RegPlate` | 11/14 550 mono | 51 | OY70 TZG / NC19 EYB |
| Card: (Registration) | `p-num` | 13/20 400 | 30 | 9 / 11 |
| Card: (Registration) | `p-indextable__sort` | 12/16 400 | 6 | Make / Model |
| Card: (Registration) | `p-indextable__scroll` | 12/16 400 | 3 | Registration / Fuel |
| Card: (Registration) | `p-indextable__row--clickable` | 12/16 400 | 3 | Forecourt / Yard |
| Card: (Registration) | `p-badge` | 12/16 500 | 2 | Ready / Received |
| Card: (Registration) | `p-btn__label` | 13/20 500 | 1 | Move |
| Card: (Registration) | `p-pagination__label` | 13/20 500 | 1 | 1–50 of 120 |

### Appointments

35 text items · 4 sizes (24, 14, 13, 12) · 3 weights (550, 500, 400). States: sales-appointments, sales-appointments-first.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Appointments |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | All booked customer test drives and view |
| Card: 26 Oct – 1 Nov 2026 | `span/div` | 12/16 400 | 13 | 8 appointments in view / Open 8:00 – 19:00 |
| Card: 26 Oct – 1 Nov 2026 | `span/div` | 14/20 550 | 7 | 26 / 27 |
| Card: 26 Oct – 1 Nov 2026 | `span/div` | 12/16 550 | 7 | Viewing: Ninoshka Natasha Afonso / Viewing: Marcell Lames |
| Card: 26 Oct – 1 Nov 2026 | `p-btn__label` | 13/20 500 | 5 | Today / Day |
| Card: 26 Oct – 1 Nov 2026 | `h2` | 14/20 550 | 1 | 26 Oct – 1 Nov 2026 |

### Claims

26 text items · 5 sizes (24, 16, 13, 12, 11) · 3 weights (550, 500, 400). States: warranties-claims.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Claims |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Customer claims raised against active wa |
| Page header | `p-btn__label` | 13/20 500 | 1 | File claim |
| Card: (Active warranties) | `span/div` | 12/16 400 | 8 | Active warranties / 1 in-house · 0 external |
| Card: (Active warranties) | `span/div` | 24/30 550 | 2 | 1 / 0 |
| Tabs | `p-tab` | 13/20 500 | 6 | Complaints / Under review |
| Tabs | `p-tab` | 13/20 550 | 1 | Open |
| Tabs | `p-tab__badge` | 11/14 550 | 1 | 0 |
| Tabs | `p-tab__badge` | 11/14 500 | 1 | 0 |
| Card: No claims match | `p-labelled__label` | 13/20 400 | 1 | Search claims |
| Card: No claims match | `p-field__input` | 13/20 400 | 1 | Search customer, vehicle, issue… |
| Card: No claims match | `p-empty__heading` | 16/22 550 | 1 | No claims match |
| Card: No claims match | `p-empty__body` | 13/20 400 | 1 | Customer claims will appear here when fi |

### Completed sales

54 text items · 4 sizes (24, 13, 12, 11) · 3 weights (550, 500, 400). States: sales-deals.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Completed sales |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Your completed sales history. Deals stil |
| Page header | `p-page__secondary` | 13/20 500 | 1 | View pipeline |
| Page body | `span/div` | 13/20 400 | 18 | NITIN REF / — |
| Page body | `span/div` | 12/16 400 | 16 | Vehicle / Customer |
| Page body | `RegPlate` | 11/14 550 mono | 7 | MW18 ODH / LJ72 MYE |
| Page body | `span/div` | 11/14 400 | 2 | SJ / AR |
| Page body | `input` | 12/30 400 | 1 | Search reg, make/model, customer… |
| Page body | `p-labelled__label` | 13/20 400 | 1 | Source |
| Page body | `span/div` | 13/20 550 | 1 | October 2026 |
| Page body | `p-badge` | 12/16 500 | 1 | 7 |
| Page body | `p-btn__label` | 13/20 500 | 1 | Generate invoice |
| Form controls | `p-select__value` | 13/20 400 | 2 | Any date / All sources |
| Form controls | `p-select__inline-label` | 13/20 400 | 1 | Completed |

### Dashboard

73 text items · 5 sizes (24, 14, 13, 12, 11) · 3 weights (550, 500, 400). States: dashboard.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page body | `h2` | 24/30 550 | 1 | Good afternoon, Abbas |
| Page body | `p-btn__label` | 13/20 500 | 1 | Add vehicle |
| Card: (Cars in stock) | `span/div` | 13/20 400 | 6 | Cars in stock / Cars in readiness |
| Card: (Cars in stock) | `span/div` | 24/30 550 | 4 | 120 / 1 |
| Card: (Cars in stock) | `span/div` | 12/16 400 | 1 | −16 |
| Card: Recent deals | `RegPlate` | 11/14 550 mono | 6 | GF18 RCZ / MM17 KHD |
| Card: Recent deals | `p-link` | 13/20 550 | 6 | Gloria / gurvineder |
| Card: Recent deals | `span/div` | 13/20 400 | 5 | Land Rover Range Rover / Ford Focus |
| Card: Recent deals | `p-badge` | 12/16 500 | 5 | Lost / Contacted |
| Card: Recent deals | `p-datatable` | 12/16 400 | 4 | Vehicle / Customer |
| Card: Recent deals | `p-datatable` | 13/20 400 | 2 | Ali Raza Jafri / Sikander Jaffery |
| Card: Recent deals | `p-num` | 13/20 400 | 2 | 29 Oct / 28 Oct |
| Card: Recent deals | `h2` | 14/20 550 | 1 | Recent deals |
| Card: Recent deals | `p-btn__label` | 13/20 500 | 1 | View pipeline |
| Card: Recent deals | `p-num` | 12/16 400 | 1 | Added |
| Card: Stock by stage | `span/div` | 13/20 400 | 6 | Ready to sell / 3% |
| Card: Stock by stage | `span/div` | 13/20 550 | 3 | 4 / 0 |
| Card: Stock by stage | `p-card__title` | 14/20 550 | 1 | Stock by stage |
| Card: Stock by stage | `p-btn__label` | 13/20 500 | 1 | Inventory |
| Card: Appointments | `span/div` | 12/16 400 | 2 | KM21 JJK · MERCEDES-BENZ CLA 200 / 12:00 pm |
| Card: Appointments | `p-card__title` | 14/20 550 | 1 | Appointments |
| Card: Appointments | `p-btn__label` | 13/20 500 | 1 | View all |
| Card: Appointments | `span/div` | 11/14 550 | 1 | Fri |
| Card: Appointments | `span/div` | 14/20 550 | 1 | 6 |
| Card: Appointments | `span/div` | 13/20 400 | 1 | jaideep |
| Card: Latest activity | `span/div` | 13/20 400 | 5 | Data backup downloaded (1130 rows across / PX07 YYL: forecourt → staff |
| Card: Latest activity | `span/div` | 12/16 400 | 2 | Inventory · 17h ago / Finance · 18h ago |
| Card: Latest activity | `p-card__title` | 14/20 550 | 1 | Latest activity |
| Card: Latest activity | `p-btn__label` | 13/20 500 | 1 | View all |

### Deal page

54 text items · 5 sizes (24, 14, 13, 12, 11) · 3 weights (550, 500, 400). States: deal-page.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-btn__label` | 13/20 500 | 2 | Book appointment / Move to Contacted |
| Page header | `p-page__title` | 24/30 550 | 1 | Cerej · LAND ROVER DISCOVERY |
| Page header | `p-badge` | 12/16 500 | 1 | New Lead |
| Card: (New Lead) | `span/div` | 12/16 400 | 6 | New Lead / Contacted |
| Card: (New Lead) | `dt` | 12/16 400 | 4 | Price / Offer |
| Card: (New Lead) | `dd` | 13/20 550 | 3 | — / Sikander Jaffery |
| Card: (New Lead) | `span/div` | 11/14 400 | 1 | 3 days |
| Card: Customer | `p-dlist__term` | 13/20 550 | 5 | Name / Phone |
| Card: Customer | `p-dlist__desc` | 13/20 400 | 5 | Cerej / +44 7930 337193 |
| Card: Customer | `p-card__title` | 14/20 550 | 1 | Customer |
| Card: Vehicle | `p-dlist__term` | 13/20 550 | 9 | Year / Mileage |
| Card: Vehicle | `p-dlist__desc` | 13/20 400 | 8 | 2018 / 66,316 miles |
| Card: Vehicle | `span/div` | 12/16 400 | 2 | LUXURY HSE · / L-804 |
| Card: Vehicle | `p-card__title` | 14/20 550 | 1 | Vehicle |
| Card: Vehicle | `RegPlate` | 11/14 550 mono | 1 | EP18 HLV |
| Card: Activity | `p-card__title` | 14/20 550 | 1 | Activity |
| Card: Activity | `p-labelled__label` | 13/20 400 | 1 | New note |
| Card: Activity | `p-field__input` | 13/20 400 | 1 | Add a note, e.g. offered £500 off for a  |
| Card: Activity | `p-btn__label` | 13/20 500 | 1 | Add note |

### Dealer partner

24 text items · 4 sizes (24, 14, 13, 12) · 3 weights (550, 500, 400). States: dealer-partner-detail.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__secondary` | 13/20 500 | 2 | Edit partner / Delete dealer partner |
| Page header | `p-page__title` | 24/30 550 | 1 | Quality Auto Select |
| Page header | `p-badge` | 12/16 500 | 1 | Active |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Hafeez Bhai |
| Page header | `p-btn__label` | 13/20 500 | 1 | Add vehicle from this partner |
| Card: Active stock | `h2` | 14/20 550 | 1 | Active stock |
| Card: Active stock | `span/div` | 14/20 550 | 1 | ( 0 ) |
| Card: Active stock | `p-btn` | 13/20 500 | 1 | Columns |
| Card: Active stock | `p-btn` | 12/16 500 | 1 | 6 / 6 |
| Card: Active stock | `p` | 13/20 400 | 1 | No vehicles currently in stock from this |
| Card: (Historical stock (0)) | `p-btn__label` | 13/20 500 | 1 | Historical stock (0) |
| Card: Partner details | `span/div` | 12/16 400 | 5 | Contact / Phone |
| Card: Partner details | `span/div` | 13/20 400 | 2 | Hafeez Bhai / — |
| Card: Partner details | `p-card__title` | 14/20 550 | 1 | Partner details |
| Card: Notes | `p-card__title` | 14/20 550 | 1 | Notes |
| Card: Notes | `p-labelled__label` | 13/20 400 | 1 | Notes |
| Card: Notes | `p-field__input` | 13/20 400 | 1 | Free-text notes about this partner… |
| Card: Notes | `p-btn__label` | 13/20 500 | 1 | Save notes |

### External warranties

24 text items · 5 sizes (24, 16, 13, 12, 11) · 3 weights (550, 500, 400). States: warranties-external.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | External warranties |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Third-party warranties sold alongside ve |
| Page header | `p-btn__label` | 13/20 500 | 1 | New warranty |
| Card: (Active warranties) | `span/div` | 12/16 400 | 8 | Active warranties / 1 in-house · 0 external |
| Card: (Active warranties) | `span/div` | 24/30 550 | 2 | 1 / 0 |
| Tabs | `p-tab` | 13/20 500 | 4 | Pending purchase / Purchased |
| Tabs | `p-tab` | 13/20 550 | 1 | All |
| Tabs | `p-tab__badge` | 11/14 550 | 1 | 0 |
| Tabs | `p-tab__badge` | 11/14 500 | 1 | 0 |
| Card: No external warranties | `p-labelled__label` | 13/20 400 | 1 | Search external warranties |
| Card: No external warranties | `p-field__input` | 13/20 400 | 1 | Search customer, vehicle, provider… |
| Card: No external warranties | `p-empty__heading` | 16/22 550 | 1 | No external warranties |
| Card: No external warranties | `p-empty__body` | 13/20 400 | 1 | Third-party warranties show up here once |

### Forgot password

7 text items · 3 sizes (24, 13, 12) · 3 weights (550, 500, 400). States: auth-forgot-password.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Card: (CC) | `span/div` | 12/16 550 | 1 | CC |
| Card: (CC) | `h1` | 24/30 550 | 1 | Reset password |
| Card: (CC) | `p` | 13/20 400 | 1 | We'll email you a link to choose a new p |
| Card: (CC) | `p-labelled__label` | 13/20 400 | 1 | Username or email |
| Card: (CC) | `p-field__input` | 13/20 400 | 1 | you@carcapital.uk |
| Card: (CC) | `p-btn__label` | 13/20 500 | 1 | Send reset link |
| Card: (CC) | `p-link` | 13/20 400 | 1 | Back to sign in |

### Generate invoice

113 text items · 4 sizes (24, 14, 13, 12) · 3 weights (550, 500, 400). States: sales-invoice-generation.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Generate invoice |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Create a legal, two-page sales invoice f |
| Card: Vehicle | `p-card__title` | 14/20 550 | 2 | Vehicle / A . |
| Card: Vehicle | `label` | 13/20 400 | 1 | Vehicle |
| Card: Vehicle | `span/div` | 13/20 400 | 1 | * |
| Card: Vehicle | `input` | 13/30 400 | 1 | Search by reg, stock ID or model… |
| Card: Buyer details | `label` | 13/20 400 | 5 | Buyer name (e.g. MR JOHN SMITH) / Phone |
| Card: Buyer details | `p-card__title` | 14/20 550 | 2 | Buyer details / B . |
| Card: Buyer details | `span/div` | 13/20 400 | 1 | * |
| Card: Buyer details | `p` | 12/16 400 | 1 | Start typing a postcode and pick the are |
| Card: Sale details (date and line items) | `label` | 13/20 400 | 3 | Invoice date / Present mileage |
| Card: Sale details (date and line items) | `p-btn__label` | 13/20 500 | 3 | Add paid add-on / Add free add-on |
| Card: Sale details (date and line items) | `p-card__title` | 14/20 550 | 2 | Sale details (date and line items) / C . |
| Card: Sale details (date and line items) | `p-popover` | 13/30 400 | 2 | 2026-11-01 / YYYY-MM-DD |
| Card: Sale details (date and line items) | `input` | 13/30 400 | 2 | 0 / SALES PRICE |
| Card: Sale details (date and line items) | `label` | 12/16 400 | 2 | Description / Unit £ |
| Card: Sale details (date and line items) | `p` | 12/16 400 | 1 | Type |
| Card: Sale details (date and line items) | `span/div` | 13/20 400 | 1 | Vehicle price |
| Card: VAT scheme | `label` | 13/20 400 | 3 | Margin scheme (UK used-car standard) / Standard 20% VAT |
| Card: VAT scheme | `p-card__title` | 14/20 550 | 2 | VAT scheme / D . |
| Card: Payment breakdown | `label` | 13/20 400 | 6 | Customer deposit (£) / Deposit method |
| Card: Payment breakdown | `p-card__title` | 14/20 550 | 2 | Payment breakdown / E . |
| Card: Payment breakdown | `span/div` | 13/20 400 | 2 | Bank transfer / Close Brothers |
| Card: Payment breakdown | `input` | 13/30 400 | 1 | 0 |
| Card: Payment breakdown | `p-popover` | 13/30 400 | 1 | YYYY-MM-DD |
| Card: Warranty declaration | `label` | 13/20 400 | 8 | Warranty provided by / Cover type |
| Card: Warranty declaration | `span/div` | 13/20 400 | 3 | Car Capital (in-house) / Premier |
| Card: Warranty declaration | `input` | 13/30 400 | 3 | 2000 / 60 |
| Card: Warranty declaration | `p-card__title` | 14/20 550 | 2 | Warranty declaration / F . |
| Card: Warranty declaration | `p` | 12/16 400 | 1 | Issuing this invoice creates an in-house |
| Card: Pre-delivery check | `label` | 12/16 400 | 14 | Engine Starts & Idles Properly / Engine Noise is Normal (Cold/Hot & High/ |
| Card: Pre-delivery check | `label` | 13/20 400 | 7 | Lock nut / No. of keys |
| Card: Pre-delivery check | `p-card__title` | 14/20 550 | 2 | Pre-delivery check / G . |
| Card: Pre-delivery check | `input` | 13/30 400 | 2 | 2 / Full - Provided |
| Card: Pre-delivery check | `span/div` | 13/20 400 | 2 | V5C Awaited / Clear |
| Card: Pre-delivery check | `p-popover` | 13/30 400 | 1 | YYYY-MM-DD |
| Card: Notes and declarations | `label` | 13/20 400 | 4 | Include unit-stocking note / Include ID-requirement note |
| Card: Notes and declarations | `p-card__title` | 14/20 550 | 2 | Notes and declarations / H . |
| Page body | `p-btn__label` | 13/20 500 | 2 | Cancel / Generate invoice |
| Card: Cost summary | `span/div` | 13/20 400 | 7 | Vehicle (sales price) / £0.00 |
| Card: Cost summary | `span/div` | 13/20 550 | 3 | Grand total / £0.00 |
| Card: Cost summary | `p-card__title` | 14/20 550 | 1 | Cost summary |

### In-house warranties

38 text items · 4 sizes (24, 13, 12, 11) · 3 weights (550, 500, 400). States: warranties, warranties-in-house.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | In-house warranties |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Warranties Car Capital provides to buyer |
| Page header | `p-btn__label` | 13/20 500 | 1 | New warranty |
| Card: (Active warranties) | `span/div` | 12/16 400 | 8 | Active warranties / 1 in-house · 0 external |
| Card: (Active warranties) | `span/div` | 24/30 550 | 2 | 1 / 0 |
| Tabs | `p-tab` | 13/20 500 | 3 | Active / Expired |
| Tabs | `p-tab__badge` | 11/14 500 | 2 | 1 / 0 |
| Tabs | `p-tab` | 13/20 550 | 1 | All |
| Tabs | `p-tab__badge` | 11/14 550 | 1 | 1 |
| Card: (Search in-house warranties) | `p-labelled__label` | 13/20 400 | 1 | Search in-house warranties |
| Card: (Search in-house warranties) | `p-field__input` | 13/20 400 | 1 | Search customer, vehicle… |
| Card: (Vehicle) | `p-indextable__scroll` | 12/16 400 | 7 | Vehicle / Customer |
| Card: (Vehicle) | `span/div` | 12/16 400 | 2 | VOLKSWAGEN POLO / 23 Oct 2026 → 23 Nov 2026 |
| Card: (Vehicle) | `p-num` | 12/16 400 | 1 | Claims |
| Card: (Vehicle) | `RegPlate` | 11/14 550 mono | 1 | AV11 NLZ |
| Card: (Vehicle) | `p-link` | 13/20 550 | 1 | RAJESH KUMAR |
| Card: (Vehicle) | `p-indextable__primary` | 12/16 400 | 1 | +44 7949 912170 |
| Card: (Vehicle) | `p-num` | 13/20 400 | 1 | 0 |
| Card: (Vehicle) | `p-badge` | 12/16 500 | 1 | Active |
| Card: (Vehicle) | `p-btn__label` | 13/20 500 | 1 | File claim |

### Inspection queue

647 text items · 5 sizes (24, 13, 12, 11, 7) · 3 weights (550, 500, 400). States: maintenance-inspection.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Inspection queue |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Vehicles waiting on their 20-point inspe |
| Tabs | `p-tab` | 13/20 550 | 1 | Pending |
| Tabs | `p-tab__badge` | 11/14 550 | 1 | 202 |
| Tabs | `p-tab` | 13/20 500 | 1 | Completed |
| Tabs | `p-tab__badge` | 11/14 500 | 1 | 0 |
| Card: (Reg) | `p-indextable__primary` | 12/16 400 | 202 | L-709 · 22 Sept 2025 / L-750 · 21 Jan 2025 |
| Card: (Reg) | `RegPlate` | 11/14 550 mono | 187 | SN70 VLK / WM21 KCA |
| Card: (Reg) | `p-badge` | 12/16 500 | 148 | 405d waiting / MOT: no data |
| Card: (Reg) | `p-indextable__primary` | 13/20 550 | 89 | LAND ROVER RANGE ROVER / JAGUAR E-PACE |
| Card: (Reg) | `p-indextable__scroll` | 12/16 400 | 7 | Reg / Vehicle |
| Card: (Reg) | `p-indextable__scroll` | 13/20 400 | 2 | — / Shan Zaidi |
| Card: (Reg) | `span/div` | 12/16 400 | 2 | 0 / 21 / 20 / 21 |
| Card: (Reg) | `p-btn__label` | 13/20 500 | 2 | Start / Continue |
| Card: (Reg) | `p-num` | 12/16 400 | 1 | Action |
| Card: (Reg) | `p-avatar__initials` | 7/7 550 | 1 | SZ |

### Invoicing

66 text items · 6 sizes (24, 16, 14, 13, 12, 11) · 3 weights (550, 500, 400). States: admin-invoicing, admin-invoicing-all, admin-invoicing-auction-purchases, admin-invoicing-external-job-bills, admin-invoicing-first, admin-invoicing-purchase, admin-invoicing-refunds-cancellations, admin-invoicing-sales.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Invoicing |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Every invoice in one place: the company  |
| Page header | `p-btn__label` | 13/20 500 | 1 | Upload invoice |
| Tabs | `p-tab` | 13/20 500 | 6 | Auction purchases / External job bills |
| Tabs | `p-tab` | 13/20 550 | 4 | All invoices / All |
| Card: (Total invoiced) | `span/div` | 12/16 400 | 8 | Total invoiced / 1 invoice |
| Card: (Total invoiced) | `span/div` | 24/30 550 | 2 | £1,700.00 / £0.00 |
| Page body | `p-labelled__label` | 13/20 400 | 3 | Status / Search external job invoices |
| Page body | `p-field__input` | 13/20 400 | 2 | Search external job… / Search auction purchase… |
| Page body | `input` | 12/30 400 | 1 | Search invoice #, customer, reg… |
| Page body | `p-btn__label` | 13/20 500 | 1 | Add invoice |
| Page body | `span/div` | 12/16 400 | 1 | 0 of 0 invoice s |
| Form controls | `p-select__value` | 13/20 400 | 3 | Any date / All statuses |
| Form controls | `p-select__inline-label` | 13/20 400 | 2 | Invoice / Vendor |
| Card: (Invoice #) | `p-indextable__scroll` | 12/16 400 | 6 | Invoice # / Type |
| Card: (Invoice #) | `p-num` | 12/16 400 | 3 | Subtotal / VAT |
| Card: (Invoice #) | `p-badge` | 12/16 500 | 2 | Sale / Issued |
| Card: (Invoice #) | `p-num` | 13/20 400 | 2 | £1,700.00 / £103.33 |
| Card: (Invoice #) | `p-btn` | 12/16 500 | 1 | CC-INV-0007 |
| Card: (Invoice #) | `span/div` | 13/20 400 | 1 | RAJESH KUMAR |
| Card: (Invoice #) | `RegPlate` | 11/14 550 mono | 1 | AV11 NLZ |
| Card: (Invoice #) | `p-indextable__scroll` | 13/20 400 | 1 | 23 Oct 2026 |
| Card: (Invoice #) | `p-num` | 13/20 550 | 1 | £1,700.00 |
| Card: VAT summary | `span/div` | 12/16 400 | 3 | Input VAT (purchases) / Output VAT (sales) |
| Card: VAT summary | `span/div` | 14/20 550 | 2 | £0.00 / £103.33 |
| Card: VAT summary | `p-card__title` | 14/20 550 | 1 | VAT summary |
| Card: VAT summary | `p` | 12/16 400 | 1 | Input VAT (purchases) − Output VAT (sale |
| Empty state | `p-empty__heading` | 16/22 550 | 2 | No external job invoices yet / No auction purchase invoices yet |
| Empty state | `p-btn__label` | 13/20 500 | 1 | Add invoice |
| Empty state | `p-empty__body` | 13/20 400 | 1 | Uploaded supplier purchase invoices live |
| Empty state | `p-link` | 13/20 400 | 1 | All invoices → Purchase |

### Log in

8 text items · 3 sizes (24, 13, 12) · 3 weights (550, 500, 400). States: auth-login.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Card: (CC) | `p-labelled__label` | 13/20 400 | 2 | Username or email / Password |
| Card: (CC) | `span/div` | 12/16 550 | 1 | CC |
| Card: (CC) | `h1` | 24/30 550 | 1 | Log in |
| Card: (CC) | `p` | 13/20 400 | 1 | Continue to Car Capital UK |
| Card: (CC) | `p-field__input` | 13/20 400 | 1 | username |
| Card: (CC) | `p-btn__label` | 13/20 500 | 1 | Sign in |
| Card: (CC) | `p-link` | 13/20 400 | 1 | Forgot password? |

### Maintenance calendar

26 text items · 5 sizes (24, 14, 13, 12, 11) · 3 weights (550, 500, 400). States: maintenance-calendar.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Maintenance calendar |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | All maintenance and inspection jobs on o |
| Card: 26 Oct – 1 Nov 2026 | `span/div` | 12/16 400 | 10 | 3 maintenance jobs in view / Open 8:00 – 19:00 |
| Card: 26 Oct – 1 Nov 2026 | `span/div` | 14/20 550 | 7 | 26 / 27 |
| Card: 26 Oct – 1 Nov 2026 | `p-btn__label` | 13/20 500 | 5 | Today / Day |
| Card: 26 Oct – 1 Nov 2026 | `h2` | 14/20 550 | 1 | 26 Oct – 1 Nov 2026 |
| Card: 26 Oct – 1 Nov 2026 | `span/div` | 11/14 400 | 1 | All day |

### Maintenance job

27 text items · 4 sizes (24, 14, 13, 12) · 3 weights (550, 500, 400). States: maintenance-job.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Job #768DB7 |
| Page header | `p-badge` | 12/16 500 | 1 | Pending |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | New stock, needs inspection + readiness |
| Page header | `p-page__secondary` | 13/20 500 | 1 | Edit job |
| Card: Job details | `span/div` | 12/16 400 | 3 | Estimated cost / Actual cost |
| Card: Job details | `span/div` | 13/20 400 | 2 | — / 26 Oct 2026 |
| Card: Job details | `p-card__title` | 14/20 550 | 1 | Job details |
| Card: Notes and activity | `p-labelled__label` | 13/20 400 | 2 | Note type / Note |
| Card: Notes and activity | `p-card__title` | 14/20 550 | 1 | Notes and activity |
| Card: Notes and activity | `p-field__input` | 13/20 400 | 1 | Add a note… |
| Card: Notes and activity | `p-btn__label` | 13/20 500 | 1 | Add note |
| Form controls | `p-select__value` | 13/20 400 | 3 | Note / Pending |
| Card: Status | `p-card__title` | 14/20 550 | 1 | Status |
| Card: Status | `p-labelled__label` | 13/20 400 | 1 | Status |
| Card: Owner | `p-card__title` | 14/20 550 | 1 | Owner |
| Card: Owner | `p-labelled__label` | 13/20 400 | 1 | Owner |
| Card: Vehicle | `p-card__title` | 14/20 550 | 1 | Vehicle |
| Card: Vehicle | `RegPlate` | 12/16 550 mono | 1 | OY70 TZG |
| Card: Vehicle | `span/div` | 13/20 400 | 1 | BMW 3 SERIES |
| Card: Vehicle | `span/div` | 12/16 400 | 1 | CC-0124 |
| Page body | `p-btn__label` | 13/20 500 | 1 | Delete job |

### Maintenance pipeline

36 text items · 4 sizes (24, 13, 12, 11) · 3 weights (550, 500, 400). States: maintenance.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Maintenance pipeline |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Track every repair and prep job through  |
| Page header | `p-btn__label` | 13/20 500 | 1 | Add job |
| Kanban lane: Pending | `h2` | 13/20 550 | 1 | Pending |
| Kanban lane: Pending | `span/div` | 13/20 400 | 1 | 4 |
| Kanban card | `KanbanCard` | 12/16 400 | 12 | BMW 3 SERIES / #768DB7 |
| Kanban card | `RegPlate` | 11/14 550 mono | 3 | OY70 TZG / KC21 JNO |
| Kanban card | `KanbanCard` | 13/20 550 | 2 | New stock, needs inspection + readiness / Oil Condition: needs attention (Fair) |
| Kanban card | `KanbanCard` | 12/16 550 | 2 | 6 days overdue / 1 day overdue |
| Kanban lane: In progress | `h2` | 13/20 550 | 1 | In progress |
| Kanban lane: In progress | `span/div` | 13/20 400 | 1 | 0 |
| Kanban lane: In progress | `p` | 12/16 400 | 1 | No jobs here yet |
| Kanban lane: In progress | `p-btn__label` | 13/20 500 | 1 | Add job |
| Kanban lane: Completed | `h2` | 13/20 550 | 1 | Completed |
| Kanban lane: Completed | `span/div` | 13/20 400 | 1 | 0 |
| Kanban lane: Completed | `p` | 12/16 400 | 1 | No jobs here yet |
| Kanban lane: Completed | `p-btn__label` | 13/20 500 | 1 | Add job |
| Kanban lane: Stalled | `h2` | 13/20 550 | 1 | Stalled |
| Kanban lane: Stalled | `span/div` | 13/20 400 | 1 | 0 |
| Kanban lane: Stalled | `p` | 12/16 400 | 1 | No jobs here yet |
| Kanban lane: Stalled | `p-btn__label` | 13/20 500 | 1 | Add job |

### Master calendar

42 text items · 5 sizes (24, 14, 13, 12, 11) · 3 weights (550, 500, 400). States: admin-master-calendar.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Master calendar |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Every customer appointment, workshop wal |
| Card: 26 Oct – 1 Nov 2026 | `span/div` | 12/16 400 | 16 | 8 / 0 |
| Card: 26 Oct – 1 Nov 2026 | `span/div` | 14/20 550 | 7 | 26 / 27 |
| Card: 26 Oct – 1 Nov 2026 | `span/div` | 12/16 550 | 7 | Viewing: Ninoshka Natasha Afonso / Viewing: Marcell Lames |
| Card: 26 Oct – 1 Nov 2026 | `p-btn__label` | 13/20 500 | 5 | Today / Day |
| Card: 26 Oct – 1 Nov 2026 | `button` | 12/16 400 | 3 | Appointments / Workshop |
| Card: 26 Oct – 1 Nov 2026 | `h2` | 14/20 550 | 1 | 26 Oct – 1 Nov 2026 |
| Card: 26 Oct – 1 Nov 2026 | `span/div` | 11/14 400 | 1 | All day |

### Master sheet

537 text items · 5 sizes (24, 13, 12, 11, 10) · 3 weights (550, 500, 400). States: admin-master-sheet.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__secondary` | 13/20 500 | 2 | Import sheet / Export CSV |
| Page header | `p-page__title` | 24/30 550 | 1 | Master sheet |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Every car from purchase to sale. Edit ce |
| Tabs | `p-tab` | 13/20 500 | 4 | Buying / Receiving |
| Tabs | `p-tab__badge` | 11/14 500 | 4 | 33 / 19 |
| Tabs | `p-tab` | 13/20 550 | 1 | All |
| Tabs | `p-tab__badge` | 11/14 550 | 1 | 73 |
| Card: (73 of 73 columns) | `span/div` | 12/18 400 compact | 373 | 1 / MERCEDES-BENZ |
| Card: (73 of 73 columns) | `span/div` | 11/14 400 compact | 112 | Legacy S/N / Reg. number |
| Card: (73 of 73 columns) | `RegPlate` | 10/12 550 mono compact | 25 | LT07 JDK / PK63 XAW |
| Card: (73 of 73 columns) | `input` | 11/30 400 compact | 6 | Reg * / Make * |
| Card: (73 of 73 columns) | `p-btn__label` | 12/18 500 compact | 2 | 73 of 73 columns / Filter |
| Card: (73 of 73 columns) | `p-labelled__label` | 12/18 400 compact | 2 | Search / Dealer partner |
| Card: (73 of 73 columns) | `p-field__input` | 12/18 400 compact | 1 | Search reg, stock, make |
| Card: (73 of 73 columns) | `p-btn` | 12/18 500 compact | 1 | Add vehicle |
| Form controls | `p-select__value` | 12/18 400 compact | 1 | No dealer partner |

### Photo processing (404)

2 text items · 2 sizes (24, 14) · 2 weights (500, 400). States: advert-photo-processing.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page body | `h1` | 24/49 500 system-ui | 1 | 404 |
| Page body | `h2` | 14/49 400 system-ui | 1 | This page could not be found. |

### Prep and repair

20 text items · 4 sizes (24, 13, 12, 11) · 3 weights (550, 500, 400). States: maintenance-prep.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Prep & repair |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Cars between inspection and sale. They a |
| Kanban lane: Unassigned | `p-btn__label` | 13/20 500 | 2 | Open things to do / Assign |
| Kanban lane: Unassigned | `h2` | 13/20 550 | 1 | Unassigned |
| Kanban lane: Unassigned | `span/div` | 13/20 400 | 1 | 1 |
| Kanban lane: Unassigned | `span/div` | 11/14 400 | 1 | Waiting for someone to pick it up |
| Kanban lane: Unassigned | `RegPlate` | 11/14 550 mono | 1 | OY70 TZG |
| Kanban lane: Unassigned | `span/div` | 13/20 550 | 1 | BMW 3 Series |
| Kanban lane: Unassigned | `p-badge` | 12/16 500 | 1 | 9 days in stock |
| Kanban lane: Unassigned | `p-choice__label` | 13/20 400 | 1 | Oil Condition: needs attention (Fair) |
| Kanban lane: Unassigned | `p-choice__label` | 11/14 400 | 1 | In progress |
| Kanban lane: In progress | `h2` | 13/20 550 | 1 | In progress |
| Kanban lane: In progress | `span/div` | 13/20 400 | 1 | 0 |
| Kanban lane: In progress | `span/div` | 11/14 400 | 1 | Prep work under way |
| Kanban lane: In progress | `p` | 12/16 400 | 1 | Nothing here |
| Kanban lane: Ready for sales | `h2` | 13/20 550 | 1 | Ready for sales |
| Kanban lane: Ready for sales | `span/div` | 13/20 400 | 1 | 0 |
| Kanban lane: Ready for sales | `span/div` | 11/14 400 | 1 | All items done |
| Kanban lane: Ready for sales | `p` | 12/16 400 | 1 | Nothing here |

### Reports

297 text items · 5 sizes (24, 14, 13, 12, 10) · 3 weights (550, 500, 400). States: admin-reports, admin-reports-first.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Reports & analytics |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Sales and stock performance at a glance. |
| Page header | `p-btn__label` | 13/20 500 | 1 | Export report |
| Card: (Year) | `label` | 12/16 400 | 4 | Year / Make |
| Card: (Year) | `input` | 13/30 400 | 4 | All time / All makes |
| Card: (Year) | `p` | 12/16 400 | 1 | Showing . Year means the year of sale fo |
| Card: (Year) | `span/div` | 12/16 400 | 1 | All time, all stock |
| Card: (Units sold) | `span/div` | 13/20 400 | 1 | Units sold |
| Card: (Units sold) | `span/div` | 24/30 550 | 1 | 1,657 |
| Card: (Units sold) | `span/div` | 12/16 400 | 1 | All time |
| Card: (Revenue) | `span/div` | 13/20 400 | 1 | Revenue |
| Card: (Revenue) | `span/div` | 24/30 550 | 1 | £17460.1k |
| Card: (Revenue) | `span/div` | 12/16 400 | 1 | Avg £10.5k/car |
| Card: (Profit) | `span/div` | 13/20 400 | 1 | Profit |
| Card: (Profit) | `span/div` | 24/30 550 | 1 | £2834.2k |
| Card: (Profit) | `span/div` | 12/16 400 | 1 | 16.2% margin |
| Card: (Avg days in stock) | `span/div` | 13/20 400 | 1 | Avg days in stock |
| Card: (Avg days in stock) | `span/div` | 24/30 550 | 1 | 608d |
| Card: (Avg days in stock) | `span/div` | 12/16 400 | 1 | 274 unsold |
| Page body | `p-btn__label` | 13/20 500 | 3 | Month / Quarter |
| Page body | `h2` | 13/20 550 | 1 | Performance breakdown |
| Page body | `p` | 12/16 400 | 1 | Profit and revenue by month , with sourc |
| Card: Profit by month | `span/div` | 10/20 400 | 62 | £0 / £50k |
| Card: Profit by month | `p-card__title` | 14/20 550 | 1 | Profit by month |
| Card: Profit by month | `p-card__actions` | 12/16 400 | 1 | £2,834,206.75 |
| Card: Revenue by month | `span/div` | 10/20 400 | 62 | £0 / £125k |
| Card: Revenue by month | `p-card__title` | 14/20 550 | 1 | Revenue by month |
| Card: Revenue by month | `p-card__actions` | 12/16 400 | 1 | £17,460,084.47 |
| Card: Purchase source | `span/div` | 13/20 400 | 95 | Other / 809 |
| Card: Purchase source | `p-card__title` | 14/20 550 | 1 | Purchase source |
| Card: Purchase source | `span/div` | 24/30 550 | 1 | 1,931 |
| Card: Purchase source | `span/div` | 10/20 400 | 1 | vehicles |
| Card: Days in stock | `span/div` | 10/20 400 | 10 | 0 / 50 |
| Card: Days in stock | `p-card__title` | 14/20 550 | 1 | Days in stock |
| Card: Best-selling models | `span/div` | 10/20 400 | 13 | 0 sold / 25 sold |
| Card: Best-selling models | `p-card__title` | 14/20 550 | 1 | Best-selling models |
| Card: Best-selling models | `p-card__actions` | 12/16 400 | 1 | Top 8 by units |
| Card: Profit margin by model | `span/div` | 10/20 400 | 13 | 0% / 25% |
| Card: Profit margin by model | `p-card__title` | 14/20 550 | 1 | Profit margin by model |
| Card: Profit margin by model | `p-card__actions` | 12/16 400 | 1 | Profit as % of revenue |

### Reset password

6 text items · 3 sizes (24, 13, 12) · 3 weights (550, 500, 400). States: auth-reset-password.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Card: (CC) | `p-labelled__label` | 13/20 400 | 2 | New password / Confirm password |
| Card: (CC) | `span/div` | 12/16 550 | 1 | CC |
| Card: (CC) | `h1` | 24/30 550 | 1 | Set a new password |
| Card: (CC) | `p` | 13/20 400 | 1 | Choose a password you haven't used befor |
| Card: (CC) | `p-btn__label` | 13/20 500 | 1 | Update password |

### Returns and cancellations

3 text items · 3 sizes (24, 13, 12) · 3 weights (550, 500, 400). States: admin-vehicle-returns.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Returns and cancellations |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Process a sold car coming back or a canc |
| Page header | `p-btn__label` | 13/20 500 | 1 | Create return |

### Sales pipeline

158 text items · 4 sizes (24, 13, 12, 11) · 3 weights (550, 500, 400). States: sales-pipeline, sales-pipeline-board, sales-pipeline-list.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-btn__label` | 13/20 500 | 3 | Board / List |
| Page header | `p-page__title` | 24/30 550 | 1 | Sales pipeline |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Track every deal from new lead to comple |
| Kanban lane: New Lead | `h2` | 13/20 550 | 1 | New Lead |
| Kanban lane: New Lead | `span/div` | 13/20 400 | 1 | 2 |
| Kanban card | `KanbanCard` | 12/16 400 | 28 | LAND ROVER DISCOVERY / 3d in stage |
| Kanban card | `RegPlate` | 11/14 550 mono | 14 | EP18 HLV / NX69 OCV |
| Kanban card | `p-link` | 13/20 550 | 14 | Cerej / Abhi |
| Kanban card | `p-btn__label` | 13/20 500 | 1 | Generate invoice |
| Kanban lane: Contacted | `h2` | 13/20 550 | 1 | Contacted |
| Kanban lane: Contacted | `span/div` | 13/20 400 | 1 | 1 |
| Kanban lane: Viewing | `h2` | 13/20 550 | 1 | Viewing |
| Kanban lane: Viewing | `span/div` | 13/20 400 | 1 | 2 |
| Kanban lane: Deposit Taken / In Prep | `h2` | 13/20 550 | 1 | Deposit Taken / In Prep |
| Kanban lane: Deposit Taken / In Prep | `span/div` | 13/20 400 | 1 | 1 |
| Kanban lane: Collection / Delivery | `h2` | 13/20 550 | 1 | Collection / Delivery |
| Kanban lane: Collection / Delivery | `span/div` | 13/20 400 | 1 | 1 |
| Kanban lane: Completed Sale | `h2` | 13/20 550 | 1 | Completed Sale |
| Kanban lane: Completed Sale | `span/div` | 13/20 400 | 1 | 7 |
| Aside: Hidden columns | `p-btn__label` | 13/20 500 | 2 | Lost / 2 |
| Aside: Hidden columns | `h2` | 13/20 550 | 1 | Hidden columns |
| Aside: Hidden columns | `p` | 11/14 400 | 1 | Drop a deal on a column to move it there |
| Card: (Customer) | `p-indextable__row--clickable` | 13/20 400 | 17 | Land Rover Discovery / Sikander Jaffery |
| Card: (Customer) | `p-indextable__primary` | 13/20 550 | 14 | Cerej / Abhi |
| Card: (Customer) | `RegPlate` | 11/14 550 mono | 14 | EP18 HLV / NX69 OCV |
| Card: (Customer) | `p-labelled__label` | 13/20 400 | 14 | Stage for Cerej / Stage for Abhi |
| Card: (Customer) | `p-num` | 13/20 400 | 8 | — / 3d |
| Card: (Customer) | `p-indextable__scroll` | 12/16 400 | 5 | Customer / Vehicle |
| Card: (Customer) | `p-num` | 12/16 400 | 2 | Value / In stage |
| Form controls | `p-select__value` | 13/20 400 | 6 | New Lead / Contacted |

### Settings

240 text items · 4 sizes (24, 14, 13, 12) · 3 weights (550, 500, 400). States: admin-settings, admin-settings-backup, admin-settings-company, admin-settings-first, admin-settings-inspection-checklist, admin-settings-lead-channels, admin-settings-locations, admin-settings-sales-pipeline.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Settings |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Your profile, plus your company details, |
| Tabs | `p-tab` | 13/20 500 | 7 | My profile / Inspection checklist |
| Tabs | `p-tab` | 13/20 550 | 6 | Company / Backup |
| Page body | `p-layout__annotation-title` | 14/20 550 | 8 | Branding / Company details |
| Page body | `p-layout__annotation-desc` | 13/20 400 | 8 | Logos used on invoices and in the top ba / Name, address and tax details shown on i |
| Page body | `p-btn__label` | 13/20 500 | 1 | Save |
| Card: (Full logo) | `p-layout__annotated-content` | 12/16 400 | 3 | Logo and wordmark on generated invoices. / PNG or JPG, resized automatically. |
| Card: (Full logo) | `p-layout__annotated-content` | 13/20 550 | 2 | Full logo / Logo mark |
| Card: (Full logo) | `p-btn__label` | 13/20 500 | 2 | Replace / Remove |
| Card: (Name) | `p-labelled__label` | 13/20 400 | 4 | Name / Address |
| Card: (Name) | `p-field__input` | 13/20 400 | 4 | Car Capital UK / 220 Uxbridge Rd, Southall, UB1 3DZ |
| Card: (Name) | `p-labelled__help` | 13/20 400 | 1 | Up to 4 characters. |
| Card: (Working hours start) | `p-labelled__label` | 13/20 400 | 2 | Working hours start / Working hours end |
| Card: (Working hours start) | `p-labelled__help` | 13/20 400 | 2 | Drives the visible range on the Appointm / Appointments can be booked up to one hou |
| Form controls | `p-select__value` | 13/20 400 | 3 | 08:00 / 19:00 |
| Card: Status | `p-card__title` | 14/20 550 | 1 | Status |
| Card: Status | `p-badge` | 12/16 500 | 1 | Up to date |
| Card: Status | `p-layout__annotated-content` | 13/20 400 | 1 | Backed up today. |
| Card: Status | `p-layout__annotated-content` | 12/16 400 | 1 | Last backup: 31 Oct 2026, 20:30 |
| Card: Status | `p-btn__label` | 13/20 500 | 1 | Download data backup |
| Card: (1) | `p-labelled__label` | 13/20 400 | 44 | Rename MOT Expiry / Status options for MOT Expiry |
| Card: (1) | `p-field__input` | 13/20 400 | 43 | MOT Expiry / Valid, Expiring Soon, Expired, N/A |
| Card: (1) | `p-layout__annotated-content` | 12/16 400 | 22 | 1 / 2 |
| Card: (1) | `p-btn__label` | 13/20 500 | 1 | Add item |
| Card: (Rename Phone) | `p-labelled__label` | 13/20 400 | 16 | Rename Phone / Rename Website |
| Card: (Rename Phone) | `p-field__input` | 13/20 400 | 16 | Phone / Website |
| Card: (Rename Phone) | `p-btn__label` | 13/20 500 | 3 | Hide / Show |
| Card: (Rename Phone) | `p-badge` | 12/16 500 | 2 | Built in / Hidden |
| Card: (Forecourt) | `p-layout__annotated-content` | 13/20 400 | 5 | Forecourt / Yard |
| Card: (Forecourt) | `p-badge` | 12/16 500 | 1 | Built in |
| Card: (Forecourt) | `p-labelled__label` | 13/20 400 | 1 | Add a location |
| Card: (Forecourt) | `p-field__input` | 13/20 400 | 1 | Yard 2 |
| Card: (Forecourt) | `p-btn__label` | 13/20 500 | 1 | Add location |
| Card: (Rename New Lead) | `p-labelled__label` | 13/20 400 | 9 | Rename New Lead / Rename Contacted |
| Card: (Rename New Lead) | `p-field__input` | 13/20 400 | 8 | New Lead / Contacted |
| Card: (Rename New Lead) | `p-layout__annotated-content` | 12/16 400 | 5 | No side effects / Reserves the car |
| Card: (Rename New Lead) | `p-btn__label` | 13/20 500 | 2 | Hide / Add stage |

### Users and permissions

73 text items · 4 sizes (24, 13, 12, 9) · 3 weights (550, 500, 400). States: admin-users-and-permissions, admin-users-first.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Users and permissions |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | Manage who is on your team and exactly w |
| Page header | `p-btn__label` | 13/20 500 | 1 | Add staff member |
| Card: (Filter members) | `span/div` | 12/16 400 | 54 | 5 member s / Add Vehicle |
| Card: (Filter members) | `p-avatar__initials` | 9/9 550 | 5 | AJ / SJ |
| Card: (Filter members) | `span/div` | 13/20 400 | 5 | Abbas Jaffery / Sikander Jaffery |
| Card: (Filter members) | `p-badge` | 12/16 500 | 4 | You / Super user |
| Card: (Filter members) | `p-labelled__label` | 13/20 400 | 1 | Filter members |
| Card: (Filter members) | `p-field__input` | 13/20 400 | 1 | Filter by name or email… |

### Vehicle advert

176 text items · 4 sizes (14, 13, 12, 11) · 3 weights (550, 500, 400). States: vehicle-advert.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Card: (OY70 TZG) | `RegPlate` | 11/14 550 mono | 1 | OY70 TZG |
| Card: (OY70 TZG) | `span/div` | 14/20 550 | 1 | 2020 BMW 3 SERIES |
| Card: (OY70 TZG) | `span/div` | 12/16 400 | 1 | 70,624 mi · BLACK · automatic · petrol |
| Card: (OY70 TZG) | `p-badge` | 12/16 500 | 1 | Draft |
| Card: (OY70 TZG) | `p-btn__label` | 13/20 500 | 1 | Save advert |
| Card: AutoTrader spotlight | `p-labelled__label` | 13/20 400 | 2 | Attention grabber / Key selling point |
| Card: AutoTrader spotlight | `p-field__input` | 13/20 400 | 2 | Attention grabber… / Key selling point… |
| Card: AutoTrader spotlight | `p-labelled__help` | 13/20 400 | 2 | Short hook, e.g. “Just arrived” or “1 ow / The single best reason to buy this car. |
| Card: AutoTrader spotlight | `span/div` | 12/16 400 | 2 | 0 / 30 / 0 / 35 |
| Card: AutoTrader spotlight | `h2` | 14/20 550 | 1 | AutoTrader spotlight |
| Card: AutoTrader spotlight | `p` | 13/20 400 | 1 | The bold text buyers see first on the se |
| Card: Taxonomy | `p-labelled__label` | 13/20 400 | 8 | Make / Model |
| Card: Taxonomy | `p-field__input` | 13/20 400 | 8 | BMW / 3 SERIES |
| Card: Taxonomy | `h2` | 14/20 550 | 1 | Taxonomy |
| Card: Taxonomy | `p` | 13/20 400 | 1 | Mapped to AutoTrader's hierarchy · synce |
| Card: Vehicle description | `p-btn__label` | 13/20 500 | 2 | Generate / Clear text |
| Card: Vehicle description | `h2` | 14/20 550 | 1 | Vehicle description |
| Card: Vehicle description | `p` | 13/20 400 | 1 | 0 / 3,000 chars · the main advert copy |
| Card: Vehicle description | `p-labelled__label` | 13/20 400 | 1 | Vehicle description |
| Card: Vehicle description | `p-field__input` | 13/20 400 | 1 | Describe the key facts about the vehicle |
| Card: Vehicle description | `span/div` | 12/16 400 | 1 | 0 / 3,000 |
| Card: Dealer strapline | `h2` | 14/20 550 | 1 | Dealer strapline |
| Card: Dealer strapline | `p` | 13/20 400 | 1 | Shown beneath the description on every a |
| Card: Dealer strapline | `p-btn__label` | 13/20 500 | 1 | Use default |
| Card: Dealer strapline | `p-labelled__label` | 13/20 400 | 1 | Dealer strapline |
| Card: Dealer strapline | `p-field__input` | 13/20 400 | 1 | Enter dealer strapline here… |
| Card: Dealer strapline | `span/div` | 12/16 400 | 1 | 0 / 999 |
| Card: Website highlights | `span/div` | 12/16 400 | 7 | 0 / 500 / 01 |
| Card: Website highlights | `p-labelled__label` | 13/20 400 | 6 | Vehicle subtitle / Highlight 1 |
| Card: Website highlights | `p-field__input` | 13/20 400 | 6 | Subtitle text… / Highlight 1… |
| Card: Website highlights | `h2` | 14/20 550 | 1 | Website highlights |
| Card: Website highlights | `p` | 13/20 400 | 1 | Subtitle + up to 5 bullet points shown o |
| Card: Equipment | `p-choice__label` | 13/20 400 | 58 | Air Conditioning / Air-Conditioning - Automatic |
| Card: Equipment | `p-tab` | 13/20 500 | 4 | Exterior / Interior |
| Card: Equipment | `span/div` | 13/20 550 | 2 | 0 feature s selected / Selected ( 0 ) |
| Card: Equipment | `h2` | 14/20 550 | 1 | Equipment |
| Card: Equipment | `p` | 13/20 400 | 1 | 0 features selected |
| Card: Equipment | `p-tab` | 13/20 550 | 1 | Comfort |
| Card: Equipment | `p-labelled__label` | 13/20 400 | 1 | Search Comfort |
| Card: Equipment | `p-field__input` | 13/20 400 | 1 | Search Comfort… |
| Card: Equipment | `p-btn__label` | 13/20 500 | 1 | Select all in view |
| Card: Equipment | `span/div` | 12/16 400 | 1 | No features selected, pick from the cate |
| Card: Channels and pricing | `span/div` | 13/20 400 | 4 | Car Capital UK / AutoTrader |
| Card: Channels and pricing | `span/div` | 12/16 400 | 4 | thecarcapital.co.uk / Profile / full advert |
| Card: Channels and pricing | `p-labelled__label` | 13/20 400 | 2 | Advertised price / Floor (minimum) |
| Card: Channels and pricing | `p-field__input` | 13/20 400 | 2 | 0 / Not set |
| Card: Channels and pricing | `h2` | 14/20 550 | 1 | Channels and pricing |
| Card: Channels and pricing | `p` | 13/20 400 | 1 | Where this advert appears and at what pr |
| Card: Channels and pricing | `p-field__affix` | 13/20 400 | 1 | £ |
| Card: (3 of 6 advert fields ready · s) | `span/div` | 12/16 400 | 2 | 3 of 6 advert fields ready · saved as / draft |
| Card: (3 of 6 advert fields ready · s) | `p-btn__label` | 13/20 500 | 1 | Save advert |
| Card: Live preview | `span/div` | 14/20 550 | 2 | BMW 3 SERIES / — |
| Card: Live preview | `span/div` | 12/16 400 | 2 | 2.0 318d MHT SE Saloon 4dr Diesel Hybrid / 2020 · 70,624 mi · automatic · petrol ·  |
| Card: Live preview | `h2` | 14/20 550 | 1 | Live preview |
| Card: Live preview | `p` | 13/20 400 | 1 | How buyers see this advert |
| Card: Advert completeness | `span/div` | 13/20 400 | 6 | Make / Model / Derivative / Vehicle Description |
| Card: Advert completeness | `span/div` | 12/16 400 | 6 | BMW 3 SERIES · 2.0 318d MHT SE Saloon 4d / Empty, generate with AI |
| Card: Advert completeness | `h2` | 14/20 550 | 1 | Advert completeness |
| Card: Advert completeness | `p` | 13/20 400 | 1 | 3 of 6 ready |

### Vehicle page

521 text items · 6 sizes (24, 16, 14, 13, 12, 11) · 3 weights (550, 500, 400). States: vehicle-detail-activity, vehicle-detail-appointments, vehicle-detail-details, vehicle-detail-financials, vehicle-detail-inspection, vehicle-detail-listing, vehicle-detail-location, vehicle-detail-overview, vehicle-detail-things-to-do1.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Card: (OY70 TZG) | `span/div` | 13/20 400 | 13 | Stock ID : / Mileage : |
| Card: (OY70 TZG) | `li` | 13/20 400 | 6 | CC-0124 / 70,624 mi |
| Card: (OY70 TZG) | `p-badge` | 12/16 500 | 2 | Ready / 9 d |
| Card: (OY70 TZG) | `p-btn__label` | 13/20 500 | 2 | 1 thing to do / Publish listing |
| Card: (OY70 TZG) | `RegPlate` | 14/20 550 mono | 1 | OY70 TZG |
| Card: (OY70 TZG) | `h1` | 24/30 550 | 1 | 2020 BMW 3 Series |
| Card: (OY70 TZG) | `p` | 13/20 400 | 1 | 2.0 318d MHT SE Saloon 4dr Diesel Hybrid |
| Card: (OY70 TZG) | `span/div` | 12/16 400 | 1 | Ready · stage 4 of 7 |
| Tabs | `p-tab` | 13/20 500 | 9 | Overview / Details |
| Tabs | `p-tab` | 13/20 550 | 9 | Activity / Appointments |
| Tabs | `p-tab__badge` | 11/14 500 | 1 | 1 |
| Tabs | `p-tab__badge` | 11/14 550 | 1 | 1 |
| Card: Activity | `span/div` | 13/20 400 | 10 | · Marked completed: Oil Condition: needs / · OY70 TZG → ready |
| Card: Activity | `p-btn__label` | 13/20 500 | 9 | All / 19 |
| Card: Activity | `span/div` | 12/16 400 | 7 | 29 Oct 2026, 21:21 / 25 Oct 2026, 19:55 |
| Card: Activity | `span/div` | 12/16 550 | 3 | 29 Oct 2026 / 25 Oct 2026 |
| Card: Activity | `span/div` | 13/20 550 | 2 | Abbas Jaffery / Shan Zaidi |
| Card: Activity | `p-badge` | 12/16 500 | 2 | Workshop / Status |
| Card: Activity | `h2` | 14/20 550 | 1 | Activity |
| Card: Activity | `p` | 13/20 400 | 1 | Every action taken on this vehicle since |
| Card: Enquiries on this vehicle | `span/div` | 12/16 400 | 6 | Capture / Customer match |
| Card: Enquiries on this vehicle | `span/div` | 12/16 550 | 6 | 01 / 02 |
| Card: Enquiries on this vehicle | `p-btn__label` | 13/20 500 | 2 | Add enquiry / Add first enquiry |
| Card: Enquiries on this vehicle | `h2` | 14/20 550 | 1 | Enquiries on this vehicle |
| Card: Enquiries on this vehicle | `p` | 13/20 400 | 1 | Every interaction with this car. Repeat  |
| Card: Enquiries on this vehicle | `p-empty__heading` | 16/22 550 | 1 | No enquiries on this vehicle yet |
| Card: Enquiries on this vehicle | `p-empty__body` | 13/20 400 | 1 | Select Add enquiry and we'll dedupe agai |
| Page body | `p-banner__message` | 13/20 550 | 3 | 41% of lost enquiries / Price |
| Page body | `span/div` | 13/20 400 | 2 | Total expenses / Expense at point of sale |
| Page body | `h2` | 14/20 550 | 1 | Performance · across all vehicles |
| Page body | `p-banner__message` | 12/16 550 | 1 | Top finding this period |
| Page body | `p-banner__message` | 13/20 400 | 1 | (25 of 61) over the last 90 days were dr |
| Page body | `p` | 12/16 400 | 1 | Every cost and every add-on revenue for  |
| Page body | `span/div` | 12/16 550 | 1 | VAT is 20% of the margin |
| Page body | `span/div` | 14/20 550 | 1 | £0.00 |
| Card: Why we lose enquiries | `span/div` | 12/16 400 | 12 | Price / · 14 |
| Card: Why we lose enquiries | `span/div` | 12/16 550 | 6 | 23 % / 21 % |
| Card: Why we lose enquiries | `h2` | 14/20 550 | 1 | Why we lose enquiries |
| Card: Why we lose enquiries | `p` | 13/20 400 | 1 | Last 90 days · 61 lost enquiries |
| Card: Recommended actions | `span/div` | 11/14 550 | 3 | 1 / 2 |
| Card: Recommended actions | `span/div` | 13/20 550 | 3 | Review pricing on aged stock / Audit finance partner conversion |
| Card: Recommended actions | `p` | 12/16 400 | 3 | 14 enquiries lost to price this quarter, / 11 enquiries lost to Finance: could indi |
| Card: Recommended actions | `p-btn__label` | 13/20 500 | 3 | View aged stock / Open report |
| Card: Recommended actions | `h2` | 14/20 550 | 1 | Recommended actions |
| Card: Recommended actions | `p` | 13/20 400 | 1 | Data-driven next steps based on this per |
| Card: Identity | `span/div` | 13/20 400 | 22 | Make / BMW |
| Card: Identity | `p-card__title` | 14/20 550 | 1 | Identity |
| Card: Identity | `p-btn__label` | 13/20 500 | 1 | Edit |
| Card: Acquisition | `span/div` | 13/20 400 | 14 | Stock ID / CC-0124 |
| Card: Acquisition | `p-card__title` | 14/20 550 | 1 | Acquisition |
| Card: Acquisition | `p-btn__label` | 13/20 500 | 1 | Edit |
| Card: Documentation | `span/div` | 13/20 400 | 10 | V5 received / No |
| Card: Documentation | `p-card__title` | 14/20 550 | 1 | Documentation |
| Card: Documentation | `p-btn__label` | 13/20 500 | 1 | Edit |
| Card: Registration & compliance | `span/div` | 13/20 400 | 16 | Registration / OY70 TZG |
| Card: Registration & compliance | `p-badge` | 12/16 500 | 2 | Valid / Untaxed |
| Card: Registration & compliance | `p-card__title` | 14/20 550 | 1 | Registration & compliance |
| Card: Registration & compliance | `p-btn__label` | 13/20 500 | 1 | Edit |
| Card: Buying (master sheet) | `span/div` | 13/20 400 | 11 | Legacy S/N / — |
| Card: Buying (master sheet) | `p-card__title` | 14/20 550 | 1 | Buying (master sheet) |
| Card: Buying (master sheet) | `p-btn__label` | 13/20 500 | 1 | Edit |
| Card: Receiving (master sheet) | `span/div` | 13/20 400 | 9 | Log book / — |
| Card: Receiving (master sheet) | `p-card__title` | 14/20 550 | 1 | Receiving (master sheet) |
| Card: Receiving (master sheet) | `p-btn__label` | 13/20 500 | 1 | Edit |
| Card: Sales data (master sheet) | `span/div` | 13/20 400 | 7 | Available / sold / AVAILABLE |
| Card: Sales data (master sheet) | `p-card__title` | 14/20 550 | 1 | Sales data (master sheet) |
| Card: Sales data (master sheet) | `p-btn__label` | 13/20 500 | 1 | Edit |
| Card: Money out · expenses | `span/div` | 13/20 400 | 23 | Buying price / £0.00 |
| Card: Money out · expenses | `p-card__title` | 14/20 550 | 1 | Money out · expenses |
| Card: Money out · expenses | `p-btn__label` | 13/20 500 | 1 | Edit |
| Card: Money in · revenue | `span/div` | 13/20 400 | 15 | Retail (web price) / £0.00 |
| Card: Money in · revenue | `h2` | 14/20 550 | 1 | Money in · revenue |
| Card: Money in · revenue | `p` | 13/20 400 | 1 | Retail £0.00 + add-ons |
| Card: Money in · revenue | `p-badge` | 12/16 500 | 1 | £0.00 |
| Card: Money in · revenue | `span/div` | 14/20 550 | 1 | £0.00 |
| Card: (Net profit after VAT) | `span/div` | 13/20 400 | 1 | Net profit after VAT |
| Card: (Net profit after VAT) | `span/div` | 24/30 550 | 1 | — |
| Card: Expenses at point of sale | `span/div` | 13/20 400 | 8 | Finance company charges / commission / £0.00 |
| Card: Expenses at point of sale | `p-card__title` | 14/20 550 | 1 | Expenses at point of sale |
| Card: Expenses at point of sale | `p-btn__label` | 13/20 500 | 1 | Edit |
| Card: AutoTrader market value | `span/div` | 13/20 400 | 8 | Retail / £16,419.00 |
| Card: AutoTrader market value | `h2` | 14/20 550 | 1 | AutoTrader market value |
| Card: AutoTrader market value | `p` | 13/20 400 | 1 | valued 23 Oct 2026 · 70,624 mi |
| Card: Purchase information | `span/div` | 13/20 400 | 11 | Supplier / BRITISH CAR AUCTIONS LIMITED |
| Card: Purchase information | `h2` | 14/20 550 | 1 | Purchase information |
| Card: Purchase information | `p` | 13/20 400 | 1 | Invoice · 22 Oct 2026 |
| Card: Purchase information | `p-btn__label` | 13/20 500 | 1 | Print invoice |
| Card: External invoices | `span/div` | 12/16 400 | 4 | Auction purchase / External jobs |
| Card: External invoices | `p-btn__label` | 13/20 500 | 2 | Add purchase / Add external job |
| Card: External invoices | `span/div` | 12/16 550 | 2 | Add purchase / Add external job |
| Card: External invoices | `h2` | 14/20 550 | 1 | External invoices |
| Card: External invoices | `p` | 13/20 400 | 1 | Auction-purchase + external-job spend lo |
| Card: External invoices | `span/div` | 24/30 550 | 1 | £0.00 |
| Card: External invoices | `span/div` | 11/14 400 | 1 | 0 invoice s |
| Card: VAT on margin | `span/div` | 13/20 400 | 4 | Margin / VAT |
| Card: VAT on margin | `span/div` | 12/16 400 | 4 | sale price − total cost / margin × 20% |
| Card: VAT on margin | `h2` | 14/20 550 | 1 | VAT on margin |
| Card: VAT on margin | `p` | 13/20 400 | 1 | Set a web price to see the margin and VA |
| Card: VAT on margin | `p-badge` | 12/16 500 | 1 | 20% of margin |
| Card: VAT on margin | `span/div` | 14/20 550 | 1 | — |
| Card: (95%) | `span/div` | 12/16 400 | 2 | Inspector: Abbas Jaffery / All changes saved |
| Card: (95%) | `p-btn__label` | 13/20 500 | 2 | Reset / Complete inspection |
| Card: (95%) | `span/div` | 11/14 550 | 1 | 95 % |
| Card: (95%) | `span/div` | 13/20 400 | 1 | 20 / 21 completed |
| Card: (95%) | `p-badge` | 12/16 500 | 1 | 1 flagged |
| Card: (1) | `span/div` | 12/16 400 | 21 | 1 / 2 |
| Card: (1) | `span/div` | 13/20 400 | 21 | MOT Expiry / Oil Condition |
| Card: (1) | `p-labelled__label` | 13/20 400 | 21 | Status for MOT Expiry / Status for Oil Condition |
| Card: (1) | `input` | 12/30 400 | 4 | 29/09/2027 / Describe what needs doing… |
| Form controls | `p-select__value` | 13/20 400 | 13 | Valid / Fair |
| Card: Inspection notes | `p-card__title` | 14/20 550 | 1 | Inspection notes |
| Card: Inspection notes | `p-card__actions` | 12/16 400 | 1 | 0 note s · append-only |
| Card: Inspection notes | `p-labelled__label` | 13/20 400 | 1 | Note |
| Card: Inspection notes | `p-field__input` | 13/20 400 | 1 | Add a note… |
| Card: Inspection notes | `p-btn__label` | 13/20 500 | 1 | Add note |
| Empty state | `p-empty__heading` | 16/22 550 | 1 | Not listed yet |
| Empty state | `p-empty__body` | 13/20 400 | 1 | Vehicles in ‘ready’ status can be listed |
| Empty state | `p-btn__label` | 13/20 500 | 1 | Open advert editor |
| Card: Forecourt | `span/div` | 13/20 400 | 5 | Forecourt / Yard |
| Card: Forecourt | `h2` | 14/20 550 | 1 | Forecourt |
| Card: Forecourt | `span/div` | 12/16 400 | 1 | Since Oct 23 · 8 day s · 0 movements on  |
| Card: Forecourt | `p-btn__label` | 13/20 500 | 1 | Move vehicle |
| Card: Forecourt | `span/div` | 11/14 550 | 1 | Here now |
| Card: Movement history | `p-card__title` | 14/20 550 | 1 | Movement history |
| Card: Movement history | `span/div` | 13/20 550 | 1 | Arrived in stock |
| Card: Movement history | `span/div` | 12/16 400 | 1 | Oct 23, 2026 · Shan Zaidi |
| Card: (Web price) | `span/div` | 12/16 400 | 9 | Web price / No floor set |
| Card: (Web price) | `span/div` | 24/30 550 | 3 | — / 9 |
| Card: (Web price) | `dt` | 13/20 400 | 3 | Trade / Part-ex |
| Card: (Web price) | `dd` | 13/20 550 | 3 | £15,412.00 / £15,332.00 |
| Card: (Web price) | `span/div` | 13/20 400 | 1 | AutoTrader valuation |
| Card: (Web price) | `p-btn__label` | 13/20 500 | 1 | Refresh |
| Card: Pricing | `span/div` | 13/20 400 | 4 | Web price / — |
| Card: Pricing | `h2` | 14/20 550 | 1 | Pricing |
| Card: Pricing | `p-btn__label` | 13/20 500 | 1 | Edit |
| Card: Pricing | `span/div` | 12/16 400 | 1 | Never shown to customers |
| Card: Location | `span/div` | 13/20 400 | 3 | Currently at / Forecourt |
| Card: Location | `span/div` | 12/16 400 | 2 | Since Oct 23 · 8 days / Recent moves |
| Card: Location | `h2` | 14/20 550 | 1 | Location |
| Card: Location | `p-btn__label` | 13/20 500 | 1 | Move vehicle |
| Card: Sales highlights | `dt` | 13/20 400 | 4 | Mileage / Service history |
| Card: Sales highlights | `dd` | 13/20 400 | 4 | 70,624 mi / Full |
| Card: Sales highlights | `h2` | 14/20 550 | 1 | Sales highlights |
| Card: Things to do · 1 item | `span/div` | 12/16 400 | 5 | 0 / Nothing here. |
| Card: Things to do · 1 item | `p-badge` | 12/16 500 | 3 | Pending / In progress |
| Card: Things to do · 1 item | `p-btn__label` | 13/20 500 | 2 | Download job card / Add |
| Card: Things to do · 1 item | `input` | 13/30 400 | 2 | Oil Condition: needs attention (Fair) / — |
| Card: Things to do · 1 item | `h2` | 14/20 550 | 1 | Things to do · 1 item |
| Card: Things to do · 1 item | `p` | 13/20 400 | 1 | 0 of 1 done · 1 still outstanding |
| Card: Things to do · 1 item | `span/div` | 11/14 400 | 1 | inspection |
| Card: Things to do · 1 item | `span/div` | 13/20 400 | 1 | Grand total |
| Card: Things to do · 1 item | `span/div` | 14/20 550 | 1 | £0.00 |

### Vendors

74 text items · 3 sizes (24, 13, 12) · 3 weights (550, 500, 400). States: admin-vendors-dealer-partners, admin-vendors-garages.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__secondary` | 13/20 500 | 2 | Delete all dealer partners / Delete all garages |
| Page header | `p-btn__label` | 13/20 500 | 2 | Add dealer partner / Add garage |
| Page header | `p-page__title` | 24/30 550 | 1 | Vendors |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | The service garages you send work to and |
| Tabs | `p-tab` | 13/20 500 | 2 | Garages / Dealer partners |
| Tabs | `p-tab` | 13/20 550 | 2 | Dealer partners / Garages |
| Card: (Dealer partners) | `span/div` | 12/16 400 | 8 | Dealer partners / 6 active |
| Card: (Dealer partners) | `span/div` | 24/30 550 | 3 | 6 / 0 |
| Card: (Contact) | `p-indextable__link` | 13/20 550 | 6 | Hafeez Bhai / Irfan Bhai |
| Card: (Contact) | `p-indextable__scroll` | 13/20 400 | 6 | — / Quality Auto Select |
| Card: (Contact) | `p-indextable__scroll` | 12/16 400 | 3 | Contact / Phone |
| Card: (Contact) | `p-num` | 12/16 400 | 2 | Active stock / Actions |
| Card: (Contact) | `p-num` | 13/20 400 | 1 | — |
| Card: (Garages) | `span/div` | 12/16 400 | 8 | Garages / 10 active |
| Card: (Garages) | `span/div` | 24/30 550 | 4 | 10 / 0 |
| Card: (Name) | `p-indextable__primary` | 13/20 550 | 10 | Asad Body Shop / Haider Seat Cover |
| Card: (Name) | `p-badge` | 12/16 500 | 5 | Bodywork / Mechanical |
| Card: (Name) | `p-indextable__scroll` | 12/16 400 | 3 | Name / Phone |
| Card: (Name) | `p-num` | 12/16 400 | 3 | Active jobs / Total spent |
| Card: (Name) | `p-indextable__row--clickable` | 13/20 400 | 1 | — |
| Card: (Name) | `p-num` | 13/20 400 | 1 | — |

### Workshop

5 text items · 4 sizes (24, 16, 13, 12) · 3 weights (550, 500, 400). States: maintenance-workshop.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Page header | `p-page__title` | 24/30 550 | 1 | Workshop |
| Page header | `p-page__subtitle` | 12/16 400 | 1 | External, walk-in customer service jobs, |
| Card: No workshop jobs | `p-empty__heading` | 16/22 550 | 1 | No workshop jobs |
| Card: No workshop jobs | `p-empty__body` | 13/20 400 | 1 | Track customer walk-in service appointme |
| Card: No workshop jobs | `p-btn__label` | 13/20 500 | 1 | Add workshop job |

### Overlay: book appointment

19 text items · 2 sizes (16, 13) · 3 weights (550, 500, 400). States: dialog-book-appointment.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Dialog: Book appointment: Cerej | `p-labelled__label` | 13/20 400 | 8 | Type / Customer name |
| Dialog: Book appointment: Cerej | `p-select__value` | 13/20 400 | 2 | Viewing / 9:00 |
| Dialog: Book appointment: Cerej | `p-field__input` | 13/20 400 | 2 | Cerej / +44 7930 337193 |
| Dialog: Book appointment: Cerej | `p-btn__label` | 13/20 500 | 2 | Cancel / Book appointment |
| Dialog: Book appointment: Cerej | `p-modal__title` | 16/22 550 | 1 | Book appointment: Cerej |
| Dialog: Book appointment: Cerej | `p-labelled` | 13/30 400 | 1 | EP18 HLV · LAND ROVER DISCOVERY (L-804) |
| Dialog: Book appointment: Cerej | `p-labelled` | 13/20 400 | 1 | {"id":"8eb48a76-fb75-40a6-8f13-964520936 |
| Dialog: Book appointment: Cerej | `p-popover` | 13/30 400 | 1 | 2026-11-01 |
| Dialog: Book appointment: Cerej | `p-popover` | 13/20 400 | 1 | 2026-11-01 |

### Overlay: create lead

16 text items · 2 sizes (16, 13) · 3 weights (550, 500, 400). States: dialog-create-lead.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Dialog: Create lead | `p-labelled__label` | 13/20 400 | 8 | Name / Phone |
| Dialog: Create lead | `p-select__value` | 13/20 400 | 3 | Viewing / Where did this lead come from? |
| Dialog: Create lead | `p-btn__label` | 13/20 500 | 2 | Cancel / Create lead |
| Dialog: Create lead | `p-modal__title` | 16/22 550 | 1 | Create lead |
| Dialog: Create lead | `p-labelled` | 13/30 400 | 1 | Search by reg |
| Dialog: Create lead | `p-labelled__help` | 13/20 400 | 1 | Search by reg. The lead opens a deal on  |

### Overlay: deal split button

2 text items · 1 sizes (13) · 1 weights (400). States: menu-deal-split-button.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Popover / menu | `p-actionlist__text` | 13/20 400 | 2 | Change vehicle / Mark as lost |

### Overlay: import sheet

8 text items · 3 sizes (16, 13, 12) · 3 weights (550, 500, 400). States: dialog-import-sheet.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Popover / menu | `p-select__value` | 12/18 400 compact | 1 | No dealer partner |
| Dialog: Import master sheet | `p-btn__label` | 13/20 500 | 3 | Choose file / Cancel |
| Dialog: Import master sheet | `p-modal__title` | 16/22 550 | 1 | Import master sheet |
| Dialog: Import master sheet | `p-modal__body` | 13/20 400 | 1 | Upload the master sheet as an Excel file |
| Dialog: Import master sheet | `p-labelled` | 13/20 400 | 1 | Master sheet |
| Dialog: Import master sheet | `p-dropzone__hint` | 12/16 400 | 1 | Accepts .xlsx |

### Overlay: master sheet filter open

3 text items · 2 sizes (13, 12) · 1 weights (400). States: master-sheet-filter-open.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Popover / menu | `p-select__value` | 13/20 400 | 2 | Legacy S/N / At least |
| Popover / menu | `p-select__value` | 12/18 400 compact | 1 | No dealer partner |

### Overlay: move vehicle

15 text items · 2 sizes (16, 13) · 3 weights (550, 500, 400). States: dialog-move-vehicle.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Dialog: Move CC-0124: BMW 3 SERIES | `p-choice__label` | 13/20 400 | 5 | Forecourt / Yard |
| Dialog: Move CC-0124: BMW 3 SERIES | `p-modal__body` | 13/20 400 | 2 | · Currently at (since Oct 23 ) / OY70 TZG |
| Dialog: Move CC-0124: BMW 3 SERIES | `p-btn__label` | 13/20 500 | 2 | Cancel / Move vehicle |
| Dialog: Move CC-0124: BMW 3 SERIES | `p-modal__title` | 16/22 550 | 1 | Move CC-0124: BMW 3 SERIES |
| Dialog: Move CC-0124: BMW 3 SERIES | `p-modal__body` | 13/20 550 | 1 | Forecourt |
| Dialog: Move CC-0124: BMW 3 SERIES | `p-choicelist__title` | 13/20 400 | 1 | Move to |
| Dialog: Move CC-0124: BMW 3 SERIES | `p-choice__help` | 13/20 400 | 1 | Current |
| Dialog: Move CC-0124: BMW 3 SERIES | `p-labelled__label` | 13/20 400 | 1 | Notes |
| Dialog: Move CC-0124: BMW 3 SERIES | `p-field__input` | 13/20 400 | 1 | Reason for the move (optional)… |

### Overlay: new event

18 text items · 2 sizes (16, 13) · 3 weights (550, 500, 400). States: dialog-new-event.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Dialog: New event | `p-labelled__label` | 13/20 400 | 9 | Calendar / Type |
| Dialog: New event | `p-select__value` | 13/20 400 | 3 | Appointment / Viewing |
| Dialog: New event | `p-btn__label` | 13/20 500 | 2 | Cancel / Add event |
| Dialog: New event | `p-modal__title` | 16/22 550 | 1 | New event |
| Dialog: New event | `p-labelled` | 13/30 400 | 1 | Search by reg, stock ID or model… |
| Dialog: New event | `p-popover` | 13/30 400 | 1 | 2026-11-01 |
| Dialog: New event | `p-popover` | 13/20 400 | 1 | 2026-11-01 |

### Overlay: topbar user

6 text items · 2 sizes (13, 12) · 2 weights (550, 400). States: menu-topbar-user.

| Section | Component | Style (size/line weight) | Items | Example |
|---|---|---|---|---|
| Popover / menu | `p-actionlist__text` | 13/20 400 | 5 | Change vehicle / Mark as lost |
| Popover / menu | `p-actionlist__title` | 12/16 550 | 1 | abbas@carcapital.uk |
