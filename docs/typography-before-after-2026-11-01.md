# Typography before and after, 1 November 2026

> **Update, later on 1 Nov:** the five sizes were retuned to display 24/30, title 16/24, subtitle 14/20, body 13/18 and caption 12/16. The structure measured below is unchanged: five sizes, one typeface, nothing off the scale. Only the four smaller values moved, and each role still renders one size.

The same measurement, run twice on the production build: once before the type change (the [audit](typography-audit-2026-11-01.md)) and once after it. Both runs cover the same 74 page, tab, dialog and menu states. The only state missing is the Log in page, which wasn't re-measured because opening it while signed in signs you out. Each run reads the computed size, line height, weight and typeface of every visible piece of text.

## What changed

- **One typeface.** Everything is Geist Sans. Geist Mono is no longer loaded (`app/layout.tsx`, Storybook). `font-mono` and `var(--font-mono)` now point at Geist. Reg plates and codes use `font-code`, which is Geist with even-width figures.
- **Five sizes, each with one line height.** These come from the Fluid Functionalism page you shared:

  | Role | Before | After | Used for |
  |---|---|---|---|
  | Display | 24/30 | 24/30 | Page titles, big figures |
  | Title | 16/22 | **15/20** | Dialog and drawer titles, empty-state headings |
  | Subtitle | 14/20 | **13/18** | Card titles, sub-headings |
  | Body | 13/20 | **12/18** | Labels, menu items, buttons, table cells, paragraphs |
  | Caption | 12/16 | **11/14** | Descriptions, meta rows, **table headers**, badges, counters, keyboard keys |
  | ~~Micro~~ | 11/14 | removed | Folded into caption |
  | ~~Compact step~~ | one step down (to 10px) | removed | The master sheet uses the same five sizes |

- **No sizes outside the scale.**
  - Avatar initials (7–13px) now use caption, body and title.
  - Reg plates (10–14px Geist Mono) now use caption, body and subtitle, in Geist.
  - Report chart labels (10px) are now caption.
  - Legacy inputs no longer use their 30px control height as line height.
  - Next's system-ui 404 page is replaced by `app/not-found.tsx`.
- **Rules and docs.** `CLAUDE.md`, the Genaro README and docs, the Typography and Introduction pages in Storybook, `tokens.json`, `type-scale.ts` and both size contexts now describe the five sizes. The Storybook "Type step" toolbar is removed.
- **Audit.** `audit.mjs` has a new `off-scale-type` error, which flags any `body-xs`, `text-micro`, `text-2xs`, `type-compact`, `font-mono` or `text-[Npx]` that comes back.
- **Weights didn't change.** They stay at 400, 500 and 550. The page you shared sets page titles in bold 700, but bold is still off until you approve it.

## Headline

| Measure | Before | After |
|---|---|---|
| Font sizes | 9 | 5 |
| Font weights | 3 | 3 |
| Typefaces | 3 | 1 |
| Line heights | 10 | 4 |
| Size / line-height pairs | 16 | 5 |
| Distinct styles (size, line, weight, face) | 26 | 9 |
| Text items outside the five sizes | 3166 | 0 |
| Unique text items measured | 4042 | 4043 |

- Two counts are "unique text items": text that repeats on several states, such as the shell or a page header shown on every tab, counts once.
- "Outside the five sizes" counts the text items that don't match one of today's five sizes with its own line height. Before the change, that was most of the app, because the old scale used 13/20, 12/16, 14/20 and 16/22.
- Weights stay at three by choice.

## Font sizes

Each size counts unique text items, with their share of all text.

| Size | Before | After |
|---|---|---|
| 24px | 59 (1%) | 58 (1%) |
| 16px | 15 (0%) | — |
| 15px | — | 17 (0%) |
| 14px | 132 (3%) | — |
| 13px | 1783 (44%) | 131 (3%) |
| 12px | 1416 (35%) | 2166 (54%) |
| 11px | 444 (11%) | 1671 (41%) |
| 10px | 186 (5%) | — |
| 9px | 6 (0%) | — |
| 7px | 1 (0%) | — |

## Line heights

| Size / line height | Before | After |
|---|---|---|
| 10/12 | 25 (1%) | — |
| 10/20 | 161 (4%) | — |
| 11/14 | 438 (11%) | 1671 (41%) |
| 11/30 | 6 (0%) | — |
| 12/16 | 1029 (25%) | — |
| 12/18 | 380 (9%) | 2166 (54%) |
| 12/30 | 7 (0%) | — |
| 13/18 | — | 131 (3%) |
| 13/20 | 1743 (43%) | — |
| 13/30 | 40 (1%) | — |
| 14/20 | 131 (3%) | — |
| 14/49 | 1 (0%) | — |
| 15/20 | — | 17 (0%) |
| 16/22 | 15 (0%) | — |
| 24/30 | 58 (1%) | 58 (1%) |
| 24/49 | 1 (0%) | — |
| 7/7 | 1 (0%) | — |
| 9/9 | 6 (0%) | — |

The 30px pairs before were legacy inputs that used their control height as line height. The 49px pairs were Next's 404 page.

## Typefaces

| Typeface | Before | After |
|---|---|---|
| Geist | 3728 (92%) | 4043 (100%) |
| Geist Mono | 312 (8%) | — |
| system-ui | 2 (0%) | — |

## Weights

| Weight | Before | After |
|---|---|---|
| 550 | 807 (20%) | 809 (20%) |
| 500 | 411 (10%) | 412 (10%) |
| 400 | 2824 (70%) | 2822 (70%) |

## Page by page

Sizes and weights each page renders, excluding the top bar and nav rail. Pages now use three to five sizes (five only where a dialog-size title appears, as on Invoicing and the Vehicle page), and dialogs and menus use one to three.

| Page | Sizes before | Sizes after | Weights before | Weights after |
|---|---|---|---|---|
| Activity log | 24, 13, 12 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Add vehicle | 24, 14, 13, 12, 11 | 24, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Advert performance | 24, 16, 13, 12 | 24, 15, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Advert work list | 24, 16, 13, 12 | 24, 15, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Advertisers | 24, 13, 12 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| All vehicles | 24, 13, 12, 11 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Appointments | 24, 14, 13, 12 | 24, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Claims | 24, 16, 13, 12, 11 | 24, 15, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Completed sales | 24, 13, 12, 11 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Dashboard | 24, 14, 13, 12, 11 | 24, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Deal page | 24, 14, 13, 12, 11 | 24, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Dealer partner | 24, 14, 13, 12 | 24, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| External warranties | 24, 16, 13, 12, 11 | 24, 15, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Forgot password | 24, 13, 12 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Generate invoice | 24, 14, 13, 12 | 24, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| In-house warranties | 24, 13, 12, 11 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Inspection queue | 24, 13, 12, 11, 7 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Invoicing | 24, 16, 14, 13, 12, 11 | 24, 15, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Maintenance calendar | 24, 14, 13, 12, 11 | 24, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Maintenance job | 24, 14, 13, 12 | 24, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Maintenance pipeline | 24, 13, 12, 11 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Master calendar | 24, 14, 13, 12, 11 | 24, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Master sheet | 24, 13, 12, 11, 10 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Photo processing (404) | 24, 14 | 15, 12 | 500, 400 | 550, 500, 400 |
| Prep and repair | 24, 13, 12, 11 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Reports | 24, 14, 13, 12, 10 | 24, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Reset password | 24, 13, 12 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Returns and cancellations | 24, 13, 12 | 24, 15, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Sales pipeline | 24, 13, 12, 11 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Settings | 24, 14, 13, 12 | 24, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Users and permissions | 24, 13, 12, 9 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Vehicle advert | 14, 13, 12, 11 | 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Vehicle page | 24, 16, 14, 13, 12, 11 | 24, 15, 13, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Vendors | 24, 13, 12 | 24, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Workshop | 24, 16, 13, 12 | 24, 15, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Overlay: book appointment | 16, 13 | 15, 12 | 550, 500, 400 | 550, 500, 400 |
| Overlay: create lead | 16, 13 | 15, 12 | 550, 500, 400 | 550, 500, 400 |
| Overlay: deal split button | 13 | 12 | 400 | 400 |
| Overlay: import sheet | 16, 13, 12 | 15, 12, 11 | 550, 500, 400 | 550, 500, 400 |
| Overlay: master sheet filter open | 13, 12 | 12 | 400 | 400 |
| Overlay: move vehicle | 16, 13 | 15, 12 | 550, 500, 400 | 550, 500, 400 |
| Overlay: new event | 16, 13 | 15, 12 | 550, 500, 400 | 550, 500, 400 |
| Overlay: topbar user | 13, 12 | 12, 11 | 550, 400 | 550, 400 |

## Component by component

What each component rendered before and after, as size/line-height and weight, with the number of unique items. `span/div`, `p`, `label`, `a`, `input`, `h2` and `dt`/`dd` are app markup, not Genaro components.

| Component | Before | After |
|---|---|---|
| `span/div` | 13/20 400 ×514<br>12/18 400 ×373<br>12/16 400 ×298<br>10/20 400 ×161<br>11/14 400 ×122<br>14/20 550 ×34<br>12/16 550 ×33<br>24/30 550 ×25<br>13/20 550 ×17<br>11/14 550 ×11 | 12/18 400 ×887<br>11/14 400 ×580<br>11/14 550 ×44<br>13/18 550 ×34<br>24/30 550 ×25<br>12/18 550 ×17 |
| `p-indextable__primary` | 12/16 400 ×203<br>13/20 550 ×113 | 11/14 400 ×203<br>12/18 550 ×113 |
| `RegPlate` | 11/14 550 Geist Mono ×285<br>10/12 550 Geist Mono ×25<br>12/16 550 Geist Mono ×1<br>14/20 550 Geist Mono ×1 | 11/14 550 ×310<br>12/18 550 ×1<br>13/18 550 ×1 |
| `p-labelled__label` | 13/20 400 ×192<br>12/18 400 ×2 | 12/18 400 ×194 |
| `p-badge` | 12/16 500 ×192 | 11/14 500 ×192 |
| `p-btn__label` | 13/20 500 ×142<br>12/18 500 ×2 | 12/18 500 ×146 |
| `p-field__input` | 13/20 400 ×111<br>12/18 400 ×1 | 12/18 400 ×112 |
| `p-indextable__row--clickable` | 13/20 400 ×105<br>12/16 400 ×3 | 12/18 400 ×105<br>11/14 400 ×3 |
| `label` | 13/20 400 ×76<br>12/16 400 ×29 | 12/18 400 ×76<br>11/14 400 ×29 |
| `p-tab` | 13/20 500 ×49<br>13/20 550 ×25 | 12/18 500 ×49<br>12/18 550 ×25 |
| `p-choice__label` | 13/20 400 ×65<br>11/14 400 ×1 | 12/18 400 ×65<br>11/14 400 ×1 |
| `p-num` | 13/20 400 ×45<br>12/16 400 ×13<br>13/20 550 ×1 | 12/18 400 ×45<br>11/14 400 ×13<br>12/18 550 ×1 |
| `p-card__title` | 14/20 550 ×58 | 13/18 550 ×58 |
| `a` | 12/16 400 ×57 | 11/14 400 ×57 |
| `p` | 12/16 400 ×27<br>13/20 400 ×23<br>11/14 400 ×1 | 11/14 400 ×28<br>12/18 400 ×23 |
| `p-select__value` | 13/20 400 ×50<br>12/18 400 ×1 | 12/18 400 ×51 |
| `h2` | 14/20 550 ×29<br>13/20 550 ×16<br>14/49 400 system-ui ×1<br>24/30 550 ×1 | 13/18 550 ×29<br>12/18 550 ×16<br>24/30 550 ×1 |
| `p-indextable__scroll` | 12/16 400 ×34<br>13/20 400 ×9 | 11/14 400 ×34<br>12/18 400 ×9 |
| `KanbanCard` | 12/16 400 ×38<br>13/20 550 ×2<br>12/16 550 ×2 | 11/14 400 ×38<br>12/18 550 ×2<br>11/14 550 ×2 |
| `p-layout__annotated-content` | 12/16 400 ×31<br>13/20 400 ×6<br>13/20 550 ×2 | 11/14 400 ×31<br>12/18 400 ×6<br>12/18 550 ×2 |
| `input` | 13/30 400 ×23<br>12/30 400 ×7<br>11/30 400 ×6 | 12/18 400 ×23<br>11/14 400 ×13 |
| `p-page__title` | 24/30 550 ×29 | 24/30 550 ×29 |
| `p-page__subtitle` | 12/16 400 ×27 | 11/14 400 ×27 |
| `p-link` | 13/20 550 ×21<br>13/20 400 ×2 | 12/18 550 ×21<br>12/18 400 ×2 |
| `sidebar:menu-sub-button` | 13/20 400 ×19<br>11/14 400 ×1 | 12/18 400 ×19<br>11/14 400 ×1 |
| `dt` | 13/20 400 ×13<br>12/16 400 ×4 | 12/18 400 ×13<br>11/14 400 ×4 |
| `p-datatable` | 12/16 400 ×13<br>13/20 400 ×4 | 11/14 400 ×13<br>12/18 400 ×4 |
| `p-popover` | 13/30 400 ×14<br>13/20 400 ×2 | 12/18 400 ×14 |
| `p-tab__badge` | 11/14 500 ×10<br>11/14 550 ×6 | 11/14 500 ×10<br>11/14 550 ×6 |
| `p-dlist__term` | 13/20 550 ×14 | 12/18 550 ×14 |
| `p-dlist__desc` | 13/20 400 ×13 | 12/18 400 ×13 |
| `dd` | 13/20 400 ×6<br>13/20 550 ×6 | 12/18 400 ×6<br>12/18 550 ×6 |
| `p-page__secondary` | 13/20 500 ×10 | 12/18 500 ×10 |
| `p-empty__heading` | 16/22 550 ×10 | 15/20 550 ×12 |
| `p-empty__body` | 13/20 400 ×9 | 12/18 400 ×11 |
| `p-layout__annotation-title` | 14/20 550 ×8 | 13/18 550 ×8 |
| `p-layout__annotation-desc` | 13/20 400 ×8 | 12/18 400 ×8 |
| `p-avatar__initials` | 9/9 550 ×6<br>7/7 550 ×1 | 11/14 550 ×7 |
| `sidebar:menu-button` | 13/20 400 ×6 | 12/18 400 ×6 |
| `p-labelled__help` | 13/20 400 ×6 | 12/18 400 ×6 |
| `p-indextable__link` | 13/20 550 ×6 | 12/18 550 ×6 |
| `li` | 13/20 400 ×6 | 12/18 400 ×6 |
| `p-indextable__sort` | 12/16 400 ×6 | 11/14 400 ×6 |
| `p-card__actions` | 12/16 400 ×5 | 11/14 400 ×5 |
| `p-modal__title` | 16/22 550 ×5 | 15/20 550 ×5 |
| `p-labelled` | 13/30 400 ×3<br>13/20 400 ×2 | 12/18 400 ×5 |
| `p-actionlist__text` | 13/20 400 ×5 | 12/18 400 ×5 |
| `p-banner__message` | 13/20 550 ×3<br>12/16 550 ×1<br>13/20 400 ×1 | 12/18 550 ×3<br>11/14 550 ×1<br>12/18 400 ×1 |
| `p-select__inline-label` | 13/20 400 ×4 | 12/18 400 ×4 |
| `p-btn` | 12/16 500 ×2<br>12/18 500 ×1<br>13/20 500 ×1 | 11/14 500 ×2<br>12/18 500 ×2 |
| `h1` | 24/30 550 ×3<br>24/49 500 system-ui ×1 | 24/30 550 ×3 |
| `p-modal__body` | 13/20 400 ×3<br>13/20 550 ×1 | 12/18 400 ×3<br>12/18 550 ×1 |
| `th` | 12/16 400 ×3 | 11/14 400 ×3 |
| `td` | 13/20 550 ×2<br>13/20 400 ×1 | 12/18 550 ×2<br>12/18 400 ×1 |
| `button` | 12/16 400 ×3 | 11/14 400 ×3 |
| `h3` | 12/16 550 ×2 | 11/14 550 ×2 |
| `p-topbar__logo` | 14/20 550 ×1 | 13/18 550 ×1 |
| `p-topbar__input` | 13/20 400 ×1 | 12/18 400 ×1 |
| `p-kbd` | 11/14 400 ×1 | 11/14 400 ×1 |
| `p-topbar__username` | 13/20 400 ×1 | 12/18 400 ×1 |
| `p-dropzone__hint` | 12/16 400 ×1 | 11/14 400 ×1 |
| `p-choicelist__title` | 13/20 400 ×1 | 12/18 400 ×1 |
| `p-choice__help` | 13/20 400 ×1 | 12/18 400 ×1 |
| `p-actionlist__title` | 12/16 550 ×1 | 11/14 550 ×1 |
| `p-field__affix` | 13/20 400 ×1 | 12/18 400 ×1 |
| `p-pagination__label` | 13/20 500 ×1 | 12/18 500 ×1 |

## Still open from the audit (not about sizes or typefaces)

These findings from the audit are unchanged by this work:

- **Idle tab colour:** idle tabs use a third grey, `--text-brand`, in `components.css`.
- **Asterisk red:** Generate invoice draws required asterisks in a second red (`text-destructive`).
- **`capitalize`:** still gives Title Case in 3 places ("Auction / Bca").
- **Emails:** the invite and credentials emails use `font-weight:600`, and the invite email has an uppercase, letter-spaced "Your roles" label.
- **PDFs:** the job card and warranty certificate headings are uppercase with letter-spacing.
- **Micro on words:** the places that used micro for words, such as "All day", "3 days", the prep lane descriptions and the board hint, are now caption. That's the scale's smallest size, so it's consistent, but it's still the smallest text on those screens.
- **Key/value labels:** they still render three ways (DescriptionList terms semibold, `dt` regular at body, `dt` regular at caption).
