# Popover

A floating panel (`shadow-300`, 12px `border-radius-popover`) anchored below or above its activator. It holds an ActionList, an OptionList or a short form.

```tsx
import { Popover } from '@/components/polaris';
```

## Use it for
- Menus and pickers attached to a button. The activator is usually a `Button` with `disclosure`, whose `onClick` toggles `active`.
- `onClose` fires on Escape and on any pointer-down outside the popover. The activator counts as inside, so its own toggle still works.
- Pair it with `ActionList onActionAnyItem` or `OptionList onChange` to close after a choice.
- `preferredAlignment="right"` lines the panel up with the activator's right edge, which suits actions at the end of a row or header. `sectioned` pads the content 16px, for small forms. `fullWidth` makes the panel as wide as the activator.
- `preferredPosition="above"` opens the panel above the activator instead of below, for activators near the bottom of the screen or a card, such as a bulk-actions bar.
- The panel is 160–400px wide and sits 4px from the activator at z-index 400. It renders in place, not in a portal, so an `overflow: hidden` ancestor clips it. Flush cards and IndexTable are examples.

## Examples

A "More actions" menu (Client Component):

```tsx
'use client';
const [active, setActive] = React.useState(false);

<Popover
  active={active}
  onClose={() => setActive(false)}
  preferredAlignment="right"
  activator={
    <Button disclosure onClick={() => setActive((open) => !open)}>
      More actions
    </Button>
  }
>
  <ActionList
    onActionAnyItem={() => setActive(false)}
    items={[
      { content: 'Duplicate', icon: 'DuplicateMinor', url: '/orders/new?duplicate=1020' },
      { content: 'Print packing slip', icon: 'PrintMajor', onAction: () => window.print() },
      { content: 'View order status page', icon: 'ViewMinor', url: '/orders/1020/status' },
    ]}
  />
</Popover>
```

A location picker. The activator shows the current choice:

```tsx
'use client';
const locations = [
  { value: 'byward', label: 'Byward Market' },
  { value: 'centretown', label: 'Centretown' },
  { value: 'hintonburg', label: 'Hintonburg' },
];
const [active, setActive] = React.useState(false);
const [location, setLocation] = React.useState(['centretown']);

<Popover
  active={active}
  onClose={() => setActive(false)}
  activator={
    <Button disclosure onClick={() => setActive((open) => !open)}>
      {locations.find((l) => l.value === location[0])?.label}
    </Button>
  }
>
  <OptionList
    title="Inventory location"
    options={locations}
    selected={location}
    onChange={(next) => {
      setLocation(next);
      setActive(false);
    }}
  />
</Popover>
```

A small form in a sectioned panel, opening upward:

```tsx
'use client';
const [active, setActive] = React.useState(false);

<Popover
  active={active}
  onClose={() => setActive(false)}
  sectioned
  preferredPosition="above"
  activator={<Button onClick={() => setActive(true)}>Add tag</Button>}
>
  <TextField label="Tag" placeholder="Wholesale" />
</Popover>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `activator` | `ReactNode` | — | Required. The element that opens the popover. |
| `active` | `boolean` | — | Required. Shows the panel. |
| `onClose` | `() => void` | — | Called on Escape and on pointer-down outside. |
| `children` | `ReactNode` | — | Panel content. |
| `preferredAlignment` | `'left' \| 'right'` | `'left'` | Aligns the panel's left or right edge with the activator. |
| `preferredPosition` | `'below' \| 'above'` | `'below'` | Opens the panel below or above the activator. |
| `sectioned` | `boolean` | — | 16px padding. |
| `fullWidth` | `boolean` | — | Panel as wide as the activator (160–400px). |
| `className` | `string` | — | Classes on the inline-block wrapper. |

## Placement
The panel is rendered in a portal on `<body>` with fixed positioning against the activator, so a scrolling or `overflow: hidden` parent (an IndexTable, a flush Card) never clips it. It follows scrolling and resizing, sits above modals (z-index 950), and copies the `data-theme` of the activator's nearest themed ancestor, so a popover opened from a dark-themed area stays dark.

## Server Components
Popover is a client component, and `active` and `onClose` are state, so use it from a Client Component.

## Accessibility
- Escape and outside clicks call `onClose`.
- The panel is portalled to the end of `<body>`, so Tab from the activator does not move into it; put focusable content first or focus it yourself when it opens. Nothing is focused automatically, and the activator gets no `aria-expanded` — set `ariaExpanded` on the activator Button.
- Clicks inside the panel count as inside for `onClose`, even though the panel is outside the activator's DOM subtree.
