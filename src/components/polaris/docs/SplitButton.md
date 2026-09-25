# SplitButton

A main action plus a chevron that opens a menu of related alternatives (the file's Split button set).

```tsx
import { SplitButton } from '@/components/polaris';
```

## Use it for
- One obvious default action with 1–4 variations: Save / Save as draft / Schedule.
- `variant="primary"` (default) when it is the view's primary action; `secondary` everywhere else.
- Menu labels are verb + noun in sentence case, like any button; mark destructive items with `destructive: true`.
- Not for unrelated actions — use a `Button` with `disclosure` and a `Popover` + `ActionList` instead.

## Examples

Save with alternatives (Client Component — `saveProduct` is a Server Action; the transition disables both halves while it runs):

```tsx
'use client';
const [pending, startTransition] = React.useTransition();

<SplitButton
  disabled={pending}
  onAction={() => startTransition(() => saveProduct('active'))}
  actions={[
    { content: 'Save as draft', icon: 'NotesMinor', onAction: () => startTransition(() => saveProduct('draft')) },
    { content: 'Schedule', icon: 'ClockMinor', url: '/products/1042/schedule' },
  ]}
>
  Save
</SplitButton>
```

Secondary, with menu items that navigate:

```tsx
<SplitButton
  variant="secondary"
  onAction={() => window.print()}
  actions={[
    { content: 'Print shipping label', url: '/orders/1020/shipping-label' },
    { content: 'Print invoice', url: '/orders/1020/invoice' },
  ]}
>
  Print packing slip
</SplitButton>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | Label of the main action. |
| `onAction` | `() => void` | — | Runs the main action. The main half has no `url` or `submit`. |
| `actions` | `MenuItem[]` | — | Menu items: `{ content, icon, helpText, suffix, destructive, active, disabled, onAction, url }`. |
| `variant` | `'primary' \| 'secondary'` | `'primary'` | Applies to both halves. |
| `disabled` | `boolean` | — | Disables both halves. |
| `className` | `string` | — | Extra classes on the root (layout only). |

The chevron toggles a right-aligned `ActionList` below the button. The menu closes when an item is chosen, when the chevron is clicked again, on Escape, or on a click outside.

## Server Components
Client component (`'use client'`). It only accepts serializable props from a Server Component (`actions` with `url`), and then the main half does nothing — render it from a Client Component that passes `onAction`.

## Accessibility
- The chevron is labelled "More actions" and reports its state with `aria-expanded`; the menu is `role="menu"` with `menuitem` entries.
- Escape closes the menu, so keyboard users can back out without choosing.
