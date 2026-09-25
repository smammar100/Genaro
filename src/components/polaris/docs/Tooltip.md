# Tooltip

A small floating label (white `bg-surface`, `shadow-300`, 8px corners, with a tail) shown while its trigger is hovered or focused.

```tsx
import { Tooltip } from '@/components/polaris';
```

## Use it for
- Naming icon-only buttons and revealing truncated text.
- Supplementary information only — never hide something essential in a tooltip; it may never appear on touch devices.
- Keep content short (max 200px wide); add the keyboard shortcut with `suffix` ("⌘S").
- `preferredPosition` picks the side: `above` (default), `below`, `left`, `right`. It doesn't flip at viewport edges, so choose a side with room.

## Examples

Icon button — still give the button its own `accessibilityLabel`:

```tsx
<Tooltip content="Print packing slip">
  <Button icon="PrintMajor" accessibilityLabel="Print packing slip" url="/orders/1020/packing-slip" />
</Tooltip>
```

Shortcut suffix, shown below the trigger:

```tsx
<Tooltip content="Search" suffix="⌘K" preferredPosition="below">
  <Button icon="SearchMinor" accessibilityLabel="Search" />
</Tooltip>
```

Truncated text — make the trigger focusable so keyboard users can reveal it too:

```tsx
<Tooltip content="Mid-century armchair – Walnut / Charcoal wool">
  <span tabIndex={0} style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    Mid-century armchair – Walnut / Charcoal wool
  </span>
</Tooltip>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | The trigger; hovering or focusing anything inside it opens the tooltip. |
| `content` | `ReactNode` | — | Required. |
| `preferredPosition` | `'above' \| 'below' \| 'left' \| 'right'` | `'above'` | Fixed side, no collision handling. |
| `suffix` | `string` | — | Keyboard shortcut rendered as a `KeyboardKey`. |
| `active` | `boolean` | — | Controls visibility: `true` keeps it open, `false` keeps it closed; omit for hover/focus. |
| `className` | `string` | — | Extra classes on the wrapping `span`. |

## Server Components
Client component (`'use client'`), but every prop is serializable — you can render it from a Server Component, trigger included (e.g. a `Button` with `url`).

## Accessibility
- While open, the bubble (`role="tooltip"`, with an id) is referenced by `aria-describedby` on the wrapping `span` — not on the trigger itself, so screen readers may not announce it when the trigger is focused. Icon-only buttons still need `accessibilityLabel`.
- It opens on keyboard focus as well as hover; the trigger must be focusable.
