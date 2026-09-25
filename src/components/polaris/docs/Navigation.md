# Navigation

The admin sidebar: 240px wide on `nav-bg`, with 28px items and 20px icons. The selected item is a raised white pill (`nav-bg-surface-selected`), and its sub-items expand below it.

```tsx
import { Navigation, NavigationSection } from '@/components/polaris';
```

## Use it for
- The `navigation` of a `Frame`, which docks it at ≥ 1040px and turns it into a drawer below that. The children are `Navigation.Section` elements. `NavigationSection` is the same component under a flat name.
- Only one item should be `selected`. `subNavigationItems` appear only under the selected item; mark the current sub-page `selected` as well.
- Work out the selection from the URL with `usePathname()` in a client wrapper. `kit/examples/_shell/nav.ts` has the full admin nav plus `navSelectionFromPath()`.
- `badge` shows a count, such as unfulfilled orders ("15"). Sub-items take a `badge` too.
- `id` (on `Navigation`, an item or a sub-item) puts a DOM id on the element, for anchors such as an onboarding tour's `#tour-nav-orders`.
- A section `title` groups sales channels or apps. `action` adds an icon button next to the title (`ChevronRightMinor` by default) and only renders when the section has a `title`.
- `fill` makes a section take up the remaining height, which pushes the sections after it to the bottom (for example, Settings).
- Item `url`s go through `PolarisProvider`'s link component, so they navigate client-side. An item with no `url` renders `href="#"`.

## Examples

A static sidebar (Server Component):

```tsx
<Navigation>
  <Navigation.Section
    items={[
      { label: 'Home', icon: 'HomeMinor', url: '/' },
      { label: 'Orders', icon: 'OrdersMinor', url: '/orders', badge: '15' },
      {
        label: 'Products',
        icon: 'ProductsMinor',
        url: '/products',
        selected: true,
        subNavigationItems: [
          { label: 'Collections', url: '/products/collections' },
          { label: 'Inventory', url: '/products/inventory', selected: true },
          { label: 'Transfers', url: '/products/transfers' },
        ],
      },
      { label: 'Customers', icon: 'CustomersMinor', url: '/customers' },
    ]}
  />
  <Navigation.Section
    title="Sales channels"
    fill
    items={[
      { label: 'Online Store', icon: 'HomeMinor', url: '/online-store' },
      { label: 'Point of Sale', icon: 'ShipmentMajor', url: '/point-of-sale' },
    ]}
  />
  <Navigation.Section items={[{ label: 'Settings', icon: 'SettingsMinor', url: '/settings' }]} />
</Navigation>
```

Selection from the URL (Client Component):

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { Navigation, type NavigationItem } from '@/components/polaris';

const items = [
  { label: 'Orders', icon: 'OrdersMinor', url: '/orders', badge: '15' },
  { label: 'Products', icon: 'ProductsMinor', url: '/products' },
  { label: 'Customers', icon: 'CustomersMinor', url: '/customers' },
] satisfies NavigationItem[];

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <Navigation>
      <Navigation.Section
        items={items.map((item) => ({ ...item, selected: pathname === item.url || pathname.startsWith(`${item.url}/`) }))}
      />
    </Navigation>
  );
}
```

A section action (Client Component). It only renders when the section has a `title`:

```tsx
'use client';
const [addingChannel, setAddingChannel] = React.useState(false); // opens an "Add sales channel" Modal

<NavigationSection
  title="Sales channels"
  action={{ icon: 'PlusMinor', accessibilityLabel: 'Add sales channel', onClick: () => setAddingChannel(true) }}
  items={[{ label: 'Online Store', icon: 'HomeMinor', url: '/online-store' }]}
/>
```

## Props

`Navigation`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | `Navigation.Section` elements. |
| `id` | `string` | — | DOM id on the `<nav>`, for example an onboarding-tour anchor. |
| `className` | `string` | — | |

`Navigation.Section` / `NavigationSection`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `NavigationItem[]` | — | Required. |
| `title` | `string` | — | Section heading: 12px semibold, `text-secondary`. |
| `fill` | `boolean` | — | The section fills the remaining height. |
| `action` | `{ icon?: IconSource; accessibilityLabel: string; onClick?: () => void }` | — | Icon button next to the title. Only renders with a `title`. |
| `className` | `string` | — | |

`NavigationItem`

| Field | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | Required. |
| `icon` | `IconSource` | — | Turns `icon-brand` when the item is selected. |
| `url` | `string` | `'#'` | Routed through `PolarisProvider`. |
| `selected` | `boolean` | — | Pill style plus `aria-current="page"`. Also shows the sub-items. |
| `badge` | `string` | — | Count on the right. |
| `disabled` | `boolean` | — | `text-disabled`, `aria-disabled`, removed from the Tab order, and no pointer clicks. |
| `onClick` | `() => void` | — | Client Components only. |
| `subNavigationItems` | `SubNavigationItem[]` | — | Shown while the item is selected. A selected sub-item gets bold text and `aria-current="page"`. |
| `id` | `string` | — | DOM id on the item's link. Use it to anchor an onboarding tour or a test to a row, since items have no other stable handle. |

`SubNavigationItem`

| Field | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | Required. |
| `url` | `string` | `'#'` | Routed through `PolarisProvider`. |
| `selected` | `boolean` | — | Bold text plus `aria-current="page"`. |
| `badge` | `string` | — | Count on the right, as on a top-level item. |
| `id` | `string` | — | DOM id on the sub-item's link. |

## Server Components
Navigation is not a client component. You can render it from a Server Component with `url`s and `selected` flags. `onClick` and `action.onClick` need a Client Component. `Navigation.Section` and `NavigationSection` both work in Server and Client Components.

## Accessibility
- Navigation renders a `<nav>` containing lists of links. Selected items and sub-items get `aria-current="page"`.
- A `disabled` item has `aria-disabled` and `tabIndex={-1}`, so it can't be clicked or tabbed to. Its `url` still sits in the link, so drop items the merchant must never reach rather than disabling them.
