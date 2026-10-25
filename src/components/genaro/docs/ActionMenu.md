# ActionMenu

A button that opens a menu of actions: a record's "More actions", or the three-dot menu at the end of a row or a card. It's a `Popover` holding an `ActionList`, opened by a `Button` with a disclosure chevron, or by an icon-only button.

```tsx
import { ActionMenu } from '@/components/genaro';
```

## Use it for
- Actions that don't each need a button: a deal's "View deal", "Book appointment" and "Change vehicle", or a kanban column's "Hide column".
- A `label` gives a secondary button with a chevron ("More actions"). Without one, the button is tertiary and icon-only, three dots by default, and needs an `accessibilityLabel` that names the record ("Job actions for OY70 TZG"). In table rows and cards, set `size="micro"` (24px).
- `items` for one group. `sections` (`[{ title?, items }]`) splits a longer menu into groups divided by a rule; put destructive actions in a last group of their own.
- Items are `MenuItem`s: `content` is a verb + noun in sentence case, `icon` takes a Genaro icon name or a lucide element, `destructive` makes the item red, and `disabled` with `helpText` says why it's unavailable. An item with a `url` is a link; the others call `onAction`.
- `preferredAlignment="right"` lines the menu up with the button's right edge, for buttons at the end of a row or a header. `preferredPosition="above"` opens it upwards, near the bottom of the screen.
- Choosing an item, Escape and a click outside close the menu. You don't manage its state.
- For a destructive action, confirm it before it runs: call `confirm()` from `useConfirm` in the item's `onAction`.
- For a single action, use a `Button`. To pick a value rather than run an action, use a `Popover` with an `OptionList`, or a `Select`. For a main action with alternatives, use a `SplitButton`.
- `renderActivator` replaces the button with your own element. It gets `onClick`, `open`, `id` and `menuId`: spread them onto a focusable element (`id` lets focus return to it).

## Examples

The three-dot menu on a maintenance job's card (Client Component):

```tsx
'use client';
const { confirm, confirmDialog } = useConfirm();

<>
  <ActionMenu
    accessibilityLabel={`Job actions for ${job.reg}`}
    size="micro"
    preferredAlignment="right"
    sections={[
      {
        items: [
          { content: 'Book appointment', icon: 'ClockMinor', onAction: () => setBookJob(job) },
          { content: 'Edit job', icon: 'EditMinor', onAction: () => setEditJob(job) },
        ],
      },
      {
        items: [
          {
            content: 'Delete job',
            icon: 'DeleteMinor',
            destructive: true,
            onAction: async () => {
              if (await confirm({ title: 'Delete maintenance job?', confirmText: 'Delete job', destructive: true })) remove(job.id);
            },
          },
        ],
      },
    ]}
  />
  {confirmDialog}
</>
```

A "More actions" button on a vehicle page. Items with only `url`s need no handlers:

```tsx
<ActionMenu
  label="More actions"
  preferredAlignment="right"
  items={[
    { content: 'View master sheet', icon: 'ViewMinor', url: '/admin/master-sheet' },
    { content: 'Print window card', icon: 'PrintMajor', url: '/vehicles/L-927/window-card' },
  ]}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `MenuItem[]` | — | One untitled group. |
| `sections` | `ActionListSection[]` | — | `[{ title?, items }]`, divided by rules. Wins over `items`. |
| `label` | `string` | — | The button's label. Leave it out for an icon-only button. |
| `icon` | `IconSource` | `'HorizontalDotsMinor'` when icon-only | The button's icon. |
| `accessibilityLabel` | `string` | — | Required for an icon-only button: names the menu. Also its native tooltip. |
| `variant` | `'primary' \| 'secondary' \| 'tertiary' \| 'plain'` | `'secondary'`, or `'tertiary'` icon-only | The button's variant. |
| `size` | `'micro' \| 'medium' \| 'large'` | `'medium'` | `micro` in rows and cards. |
| `disabled` | `boolean` | — | Disables the button. |
| `preferredAlignment` | `'left' \| 'right'` | `'left'` | Which button edge the menu lines up with. |
| `preferredPosition` | `'below' \| 'above'` | `'below'` | Opens below or above the button. |
| `defaultOpen` | `boolean` | — | Starts open, for docs and previews. |
| `renderActivator` | `(props: ActionMenuActivatorProps) => ReactNode` | — | Your own activator instead of the button. |
| `testId` | `string` | — | `data-testid` on the button. |
| `className` | `string` | — | Classes on the inline-block wrapper. |

`ActionMenuActivatorProps`: `onClick` (toggles the menu), `open` (for `aria-expanded`), `id` (put it on the focusable element) and `menuId` (the open menu's id, for `aria-controls`).

## Placement
The menu is a `Popover` panel: portalled to `<body>` and fixed against the button, so a table or an `overflow: hidden` card never clips it, and inside a `Modal` it stays in the dialog. It follows scrolling and keeps the theme of the area the button is in.

## Server Components
ActionMenu is a client component that keeps its own open state, so it renders from a Server Component when its items only use `url`. `onAction` and `renderActivator` need a Client Component.

## Accessibility
- The button has `aria-haspopup="menu"`, `aria-expanded` and, while open, `aria-controls`. The menu (`role="menu"`) is labelled by the button, and its items are `role="menuitem"`.
- Opened from the keyboard (Enter or Space), the first item takes focus; opened with a pointer, the menu does, without a focus ring. Up and Down arrows move through the items and wrap, Home and End jump to the ends, and disabled items are skipped.
- Escape and choosing an item close the menu and return focus to the button. Tab closes it and moves on from the button.
- Icon-only buttons need an `accessibilityLabel` that names the record, so a list of rows doesn't read as "Actions, Actions, Actions".
