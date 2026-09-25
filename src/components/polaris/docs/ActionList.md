# ActionList

A menu of actions, usually shown inside a Popover. Each row is 32px, with an optional icon, help text and suffix.

```tsx
import { ActionList } from '@/components/polaris';
```

## Use it for
- "More actions" menus and other lists of commands inside a `Popover`. Use `onActionAnyItem` to close the popover after any choice.
- `items` for a flat list. For long lists, use `sections` (`[{ title, items }]`), which are divided by a `border-secondary` rule. When both are set, `sections` wins.
- `destructive` items are red and hover on `bg-surface-critical-hover`. `active` marks the current choice with `bg-surface-secondary-selected` and semibold text.
- An item with a `url` renders a link, which navigates client-side through `PolarisProvider`. Other items render buttons that call `onAction`. A `disabled` item is always a disabled button, even if it has a `url`.
- `helpText` adds a 12px `text-secondary` line under the label. `suffix` takes an icon name (`'TickMinor'`) or any node.
- Labels are verb + noun in sentence case ("Duplicate order", "Delete product").
- ActionList has no surface of its own. The popover panel supplies the background and shadow.

## Examples

Inside a popover (Client Component):

```tsx
'use client';
const [active, setActive] = React.useState(false);

<Popover
  active={active}
  onClose={() => setActive(false)}
  activator={
    <Button disclosure onClick={() => setActive((open) => !open)}>
      More actions
    </Button>
  }
>
  <ActionList
    onActionAnyItem={() => setActive(false)}
    items={[
      { content: 'Duplicate product', icon: 'DuplicateMinor', url: '/products/new?duplicate=1' },
      { content: 'Print barcodes', icon: 'PrintMajor', onAction: () => window.print() },
      { content: 'Copy link', icon: 'LinkMinor', onAction: () => navigator.clipboard.writeText(window.location.href) },
    ]}
  />
</Popover>
```

Sections, help text, a suffix, and an active, destructive and disabled item. With only `url`s and no handlers, this also renders from a Server Component:

```tsx
<ActionList
  sections={[
    {
      title: 'Sales channels',
      items: [
        { content: 'Online Store', icon: 'HomeMinor', url: '/online-store', active: true, suffix: 'TickMinor' },
        { content: 'Point of Sale', icon: 'ShipmentMajor', url: '/point-of-sale', helpText: 'Last synced 5 minutes ago' },
      ],
    },
    {
      title: 'Danger zone',
      items: [{ content: 'Delete product', icon: 'DeleteMinor', destructive: true, disabled: true, helpText: 'Archive the product first' }],
    },
  ]}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `MenuItem[]` | — | A single untitled section. |
| `sections` | `ActionListSection[]` | — | `[{ title?, items }]`. Takes precedence over `items`. |
| `onActionAnyItem` | `() => void` | — | Runs after any item is chosen, links included. Close the popover here. |
| `className` | `string` | — | |

`MenuItem`

| Field | Type | Default | Notes |
|---|---|---|---|
| `content` | `string` | — | Required label. |
| `icon` | `IconSource` | — | Leading icon. |
| `helpText` | `string` | — | Second line, 12px `text-secondary`. |
| `suffix` | `ReactNode` | — | Trailing icon name or node. |
| `destructive` | `boolean` | — | `text-critical` / `icon-critical`. |
| `active` | `boolean` | — | The current choice. |
| `disabled` | `boolean` | — | Disabled button. |
| `url` | `string` | — | Renders a link. |
| `onAction` | `() => void` | — | Client Components only. |

## Server Components
ActionList is a client component. It renders from a Server Component when its items only use `url`. `onAction` and `onActionAnyItem` need a Client Component, which you'll have anyway for the Popover's `active` state.

## Accessibility
- The list has `role="menu"` and its items `role="menuitem"`. There's no arrow-key handling, so items are reached with Tab.
- Icons are decorative (`aria-hidden`), so the `content` has to say what the item does.
