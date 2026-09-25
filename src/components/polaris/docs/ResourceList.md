# ResourceList

A flush card that lists customers, locations or other resources. Each row shows media, a name, metadata and a badge. The header shows a count, and the list supports selection, sorting and bulk actions. `ResourceItem` is a standalone row for your own lists.

```tsx
import { ResourceList, ResourceItem } from '@/components/polaris';
```

## Use it for
- Lists where each row is one thing described by a name and a line of metadata, such as customers or locations. When merchants compare several attributes across rows, use IndexTable instead.
- Items are `{ id, name, url, meta, media, badge, shortcutActions }`:
  - `url` turns the name into a link to the resource (`/customers/1053`);
  - `media` is usually `<Avatar size="lg">` or a `<Thumbnail>`;
  - `badge` sits at the end of the row;
  - `shortcutActions` appear on hover or focus as micro tertiary buttons.
- The header counts the items, e.g. "Showing 3 of 50 customers", built from `resourceName` and `totalItemsCount`.
- `selectable` adds a select-all checkbox and a checkbox per row. While items are selected, the header shows "N selected" and the `promotedBulkActions`, which replace the count and the sort control.
- `sortOptions`, `sortValue` and `onSortChange` add a Select with the inline label "Sort by" on the right of the header. `filterControl` (usually `<Filters />`) goes above the header.
- Rows use `bg-surface`, turn `bg-surface-hover` on hover and `bg-surface-selected` when selected, and are divided by `border-secondary`.
- Give every item a `url`. The name link is reachable from the keyboard, and focusing it also reveals the row's shortcut actions. Rows themselves have no click handler.
- ResourceList is already a flush card, so don't wrap it in `Card`.

## Examples

Customers, rendered from a Server Component with no callbacks. Each name links to its customer:

```tsx
<ResourceList
  resourceName={{ singular: 'customer', plural: 'customers' }}
  totalItemsCount={50}
  items={[
    {
      id: '1053',
      name: 'Jaydon Stanton',
      url: '/customers/1053',
      meta: 'Ottawa, Canada · 3 orders',
      media: <Avatar name="Jaydon Stanton" size="lg" />,
      shortcutActions: [{ content: 'View orders', url: '/orders?customer=1053' }],
    },
    {
      id: '1054',
      name: 'Mae Jemison',
      url: '/customers/1054',
      meta: 'Decatur, United States · 1 order',
      media: <Avatar name="Mae Jemison" size="lg" />,
      badge: <Badge tone="info">Subscribed</Badge>,
      shortcutActions: [{ content: 'View orders', url: '/orders?customer=1054' }],
    },
  ]}
/>
```

Selection, sorting, filters and bulk actions in a client wrapper. The page passes the `customers` items down:

```tsx
'use client';
const [selected, setSelected] = React.useState<string[]>([]);
const [sort, setSort] = React.useState('updated-desc');
const [tagging, setTagging] = React.useState(false); // opens an "Add tags" Modal

<ResourceList
  selectable
  resourceName={{ singular: 'customer', plural: 'customers' }}
  items={customers}
  selectedItems={selected}
  onSelectionChange={setSelected}
  sortOptions={[
    { label: 'Newest update', value: 'updated-desc' },
    { label: 'Oldest update', value: 'updated-asc' },
    { label: 'Most spent', value: 'spent-desc' },
  ]}
  sortValue={sort}
  onSortChange={setSort}
  promotedBulkActions={[{ content: 'Add tags', onAction: () => setTagging(true) }]}
  filterControl={<Filters queryPlaceholder="Search customers" filters={[{ key: 'tag', label: 'Tagged with' }]} />}
/>
```

A standalone `ResourceItem` in a flush card:

```tsx
<Card padding="0">
  <ResourceItem media={<Thumbnail size="small" source="/products/mid-century-armchair.jpg" alt="Mid-century armchair" />}>
    <Link url="/products/1" monochrome removeUnderline>
      Mid-century armchair
    </Link>
    <div>20 in stock</div>
  </ResourceItem>
</Card>
```

## Props

`ResourceList`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `ResourceListItem[]` | — | Required. `{ id, name, url?, meta?, media?, badge?, shortcutActions? }`. `url` links the name. |
| `selectable` | `boolean` | `false` | Checkboxes and select-all. |
| `selectedItems` | `string[]` | — | Selected ids. Controlled only together with `onSelectionChange`; otherwise it's the initial selection. |
| `onSelectionChange` | `(ids: string[]) => void` | — | |
| `resourceName` | `{ singular: string; plural: string }` | `{ singular: 'item', plural: 'items' }` | Used in the header count. |
| `totalItemsCount` | `number` | `items.length` | Adds "of N" when larger than the number of items shown. |
| `filterControl` | `ReactNode` | — | Shown above the header. |
| `sortOptions` | `Array<string \| SelectOption>` | — | Options for the "Sort by" select. |
| `sortValue` | `string` | — | The selected sort option. |
| `onSortChange` | `(value: string) => void` | — | |
| `promotedBulkActions` | `Action[]` | — | Micro buttons shown while items are selected. Only `content` and `onAction` are used. |
| `className` | `string` | — | |

`ResourceListItem.shortcutActions` are `Action[]` rendered as micro tertiary buttons. They use `content`, `url` and `onAction`.

`ResourceItem`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `media` | `ReactNode` | — | Avatar or Thumbnail on the left. |
| `children` | `ReactNode` | — | Row content. It has no name styling, so make the first line a `Link` or set it semibold. |
| `className` | `string` | — | |

## Server Components
Both are client components, because the file is `'use client'`. A Server Component can pass items with `url`s, `media`/`badge` elements and `url` shortcut actions. `onSelectionChange`, `onSortChange`, `onAction`s and a `Filters` with callbacks need a Client Component.

## Accessibility
- Row checkboxes are labelled "Select {name}", and the header checkbox is labelled "Select all".
- Shortcut actions are hidden (`display: none`) until the row is hovered or something inside it has focus, such as the name link or the checkbox. A row with no `url`, no checkbox and no link in `meta` has nothing focusable, so keyboard users can't reach its shortcuts.
