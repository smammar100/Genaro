# IndexTable

The main list view for orders, products and customers, in a flush card. It combines saved-view tabs, search and filter, sortable headings, selectable rows with a floating bulk-actions bar, and pagination.

```tsx
import { IndexTable } from '@/components/polaris';
```

## Use it for
- Index pages. Put it directly in a `Page fullWidth`. It is already a flush card, so don't wrap it in `Card` (see `kit/examples/orders/OrdersIndex.tsx`). For simple lists of one kind of thing use ResourceList, and for read-only numbers use DataTable.
- `headings`: `media: true` marks a thumbnail column (cells hold a 40px `<Thumbnail size="small">`), `alignment: 'end'` right-aligns numbers such as totals, and `sortable` turns the heading into a sort button.
- `rows` are `{ id, cells, url }`, with one cell per heading. The primary cell is semibold; it defaults to the first non-media column, or you can set `primaryColumn`. When a row has a `url`, that cell links to the detail page (`/orders/1020`).
- Status cells use Badge: product status is Active = `success`, Draft = `info`, Archived = neutral; payment and fulfillment badges get `progress` pips.
- Rows are 52px tall (32px with `condensed`). Hover uses `bg-surface-hover` and selection `bg-surface-selected`.
- The table scrolls horizontally when its columns overflow. When the table itself is narrower than 490px, each row stacks: checkbox and thumbnail on the left, the other cells beside them.
- Rows are selectable by default; `selectable={false}` removes the checkboxes. While rows are selected, the heading row shows "N selected". If you pass `promotedBulkActions` or `bulkActions`, a bulk-actions bar floats at the bottom of the card. `bulkActions` as `MenuItem[]` puts those items in a menu that opens above the ••• button.
- The top bar only renders when you pass `tabs` or `filters`. It holds the tabs, a search and filter button, and a sort button. The search button swaps the tabs for the `Filters` bar and a Cancel button.
- `onSortButtonClick` handles the sort button beside the search button, for example by opening a Popover of sort options. `canCreateNewView` shows a "+" after the tabs, which calls `onCreateNewView`.
- `sortColumnIndex`, `sortDirection` and `filtersOpen` only set the initial state. After that the table tracks them itself and reports sort changes through `onSort`.

## Examples

An index page as a Server Component. Rows link to their detail pages through `url`, pagination uses `nextURL`, and selection is off because nothing on this page could act on it:

```tsx
// app/(admin)/orders/page.tsx
import { Badge, IndexTable, Page } from '@/components/polaris';

const orders = [
  { id: '1020', date: 'Jul 20 at 4:34 pm', customer: 'Jaydon Stanton', total: '$969.44', paid: true },
  { id: '1019', date: 'Jul 20 at 3:46 pm', customer: 'Ruben Westerfelt', total: '$701.19', paid: false },
  { id: '1018', date: 'Jul 20 at 3:44 pm', customer: 'Leo Carder', total: '$798.24', paid: true },
];

export default function OrdersPage() {
  return (
    <Page title="Orders" fullWidth primaryAction={{ content: 'Create order', url: '/orders/new' }}>
      <IndexTable
        selectable={false}
        headings={[{ title: 'Order' }, { title: 'Date' }, { title: 'Customer' }, { title: 'Total', alignment: 'end' }, { title: 'Payment status' }]}
        rows={orders.map((order) => ({
          id: order.id,
          url: `/orders/${order.id}`,
          cells: [
            `#${order.id}`,
            order.date,
            order.customer,
            order.total,
            order.paid ? <Badge tone="success" progress="complete">Paid</Badge> : <Badge tone="warning" progress="incomplete">Payment pending</Badge>,
          ],
        }))}
        pagination={{ hasPrevious: false, hasNext: true, nextURL: '/orders?page=2' }}
      />
    </Page>
  );
}
```

Views, search and sorting in a client wrapper. The page (a Server Component) fetches the products and renders `<ProductsTable products={products} />`:

```tsx
'use client';

import * as React from 'react';
import { Badge, IndexTable, Thumbnail, type BadgeTone, type SortDirection } from '@/components/polaris';

type Product = { id: string; title: string; image: string; status: 'Active' | 'Draft' | 'Archived'; inventory: number; vendor: string };

const views = ['All', 'Active', 'Draft', 'Archived'] as const;
const tones: Record<Product['status'], BadgeTone | undefined> = { Active: 'success', Draft: 'info', Archived: undefined };

export function ProductsTable({ products }: { products: Product[] }) {
  const [view, setView] = React.useState(0);
  const [query, setQuery] = React.useState('');
  const [direction, setDirection] = React.useState<SortDirection>('ascending');
  const visible = products
    .filter((p) => view === 0 || p.status === views[view])
    .filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (direction === 'ascending' ? 1 : -1) * a.title.localeCompare(b.title));

  return (
    <IndexTable
      tabs={views.map((content) => ({ content }))}
      selectedTab={view}
      onSelectTab={setView}
      filters={{ queryValue: query, onQueryChange: setQuery, onQueryClear: () => setQuery(''), queryPlaceholder: 'Searching all products' }}
      headings={[{ title: 'Image', media: true }, { title: 'Product', sortable: true }, { title: 'Status' }, { title: 'Inventory' }, { title: 'Vendor' }]}
      sortColumnIndex={1}
      sortDirection="ascending"
      onSort={(_column, next) => setDirection(next)}
      rows={visible.map((p) => ({
        id: p.id,
        url: `/products/${p.id}`,
        cells: [
          <Thumbnail size="small" source={p.image} alt={p.title} />,
          p.title,
          <Badge tone={tones[p.status]}>{p.status}</Badge>,
          `${p.inventory} in stock`,
          p.vendor,
        ],
      }))}
    />
  );
}
```

Controlled selection with a promoted bulk action and a ••• menu of more. `orders` comes from the page, and `markFulfilled` / `archiveOrders` are Server Actions:

```tsx
'use client';
const [selected, setSelected] = React.useState<string[]>([]);

<IndexTable
  headings={[{ title: 'Order' }, { title: 'Customer' }, { title: 'Total', alignment: 'end' }, { title: 'Fulfillment status' }]}
  rows={orders.map((order) => ({
    id: order.id,
    url: `/orders/${order.id}`,
    cells: [`#${order.id}`, order.customer, order.total, <Badge tone="attention" progress="incomplete">Unfulfilled</Badge>],
  }))}
  selectedItems={selected}
  onSelectionChange={setSelected}
  promotedBulkActions={[{ content: 'Mark as fulfilled', onAction: () => markFulfilled(selected).then(() => setSelected([])) }]}
  bulkActions={[
    { content: 'Print packing slips', icon: 'PrintMajor', url: `/orders/packing-slips?ids=${selected.join(',')}` },
    { content: 'Archive orders', onAction: () => archiveOrders(selected).then(() => setSelected([])) },
  ]}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `headings` | `IndexTableHeading[]` | — | Required. `{ title, alignment?: 'start' \| 'end', media?, sortable? }`. A media heading's title is visually hidden. |
| `rows` | `IndexTableRow[]` | — | Required. `{ id, cells: ReactNode[], url? }`. |
| `selectable` | `boolean` | `true` | Row checkboxes plus a select-all checkbox. |
| `primaryColumn` | `number` | first non-media column | The semibold column. It becomes the link when the row has a `url`. |
| `condensed` | `boolean` | — | 32px rows. |
| `sortColumnIndex` | `number` | — | Initially sorted column. |
| `sortDirection` | `SortDirection` | `'descending'` | Initial direction. |
| `onSort` | `(index: number, direction: SortDirection) => void` | — | Clicking a new column sorts it descending; clicking the active column toggles it. Sort `rows` yourself. |
| `filters` | `FiltersProps` | — | Search and filter bar, opened by the search button. |
| `filtersOpen` | `boolean` | — | Starts with the filter bar open. |
| `promotedBulkActions` | `Action[]` | — | Buttons in the bulk bar. Only `content` and `onAction` are used. |
| `bulkActions` | `boolean \| MenuItem[]` | — | Adds a ••• button to the bulk bar. Menu items open in an ActionList above it; `true` shows the button with no menu. |
| `canCreateNewView` | `boolean` | — | Shows a "+" after the tabs. |
| `onCreateNewView` | `() => void` | — | Called by the "+". |
| `onSortButtonClick` | `() => void` | — | Called by the sort button beside the search button. |
| `selectedItems` | `string[]` | — | Selected row ids. Controlled only together with `onSelectionChange`; otherwise it's the initial selection. |
| `onSelectionChange` | `(ids: string[]) => void` | — | |
| `onRowClick` | `(id: string) => void` | — | Whole-row click. Clicks on controls inside the row (links, buttons, checkboxes, fields) are left to them. Keep a link or button in the row so keyboard users can open it too. Client Components only. |
| `tabs` | `TabDescriptor[]` | — | Saved views above the table. |
| `selectedTab` | `number` | — | Controlled tab index. |
| `onSelectTab` | `(index: number) => void` | — | |
| `pagination` | `PaginationProps` | — | Rendered in the footer. |
| `className` | `string` | — | |

## Server Components
IndexTable is a client component. A Server Component can render it with data only: headings, rows with `url`s, element cells such as Badge and Thumbnail, and tabs. Selection still toggles locally. Pagination works there too, through `previousURL` / `nextURL`. Anything that responds to the merchant needs a Client Component: `onSelectionChange`, `onSort`, `onSelectTab`, `onCreateNewView`, `onSortButtonClick`, the `filters` callbacks and bulk `onAction`s. Fetch the data in the page and pass it to a small `'use client'` table like `ProductsTable`.

## Accessibility
- The row checkboxes are labelled "Select " plus the primary cell's text ("Select #1020") when that cell is a string, and "Select row" otherwise. Keep the primary cell a plain string. The header checkbox is labelled "Select all".
- The ••• bulk menu button sets `aria-expanded`.
- Sortable headings are buttons, and the sort icon shows the direction.
- Only the primary cell is a link, so make its text identify the row (for example "#1020").
