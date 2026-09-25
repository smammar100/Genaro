# Pagination

Previous and next buttons on `bg-fill-tertiary` for paged lists, with an optional label between them.

```tsx
import { Pagination } from '@/components/polaris';
```

## Use it for
- The footer of a list. `IndexTable` takes a `pagination` prop and renders the control for you. For a ResourceList or a custom list, render Pagination underneath it.
- Moving to the previous or next record on a detail page: pass the same props to `Page pagination`, which places the control at the top right of the header.
- A `label` such as "1–50 of 1,284" or "Page 2 of 26".
- Each button is disabled unless `hasPrevious` or `hasNext` is true.
- `previousURL` / `nextURL` turn the arrows into links (client-side through `PolarisProvider`), so paging works straight from a Server Component. A `?page=` URL that the page reads is the usual Next.js setup. Without URLs, change pages in `onPrevious` / `onNext`. When both are set, the link navigates and the callback also runs.

## Examples

URL-driven paging in a Server Component. The page reads `?page=` from `searchParams` (a Promise in Next.js 15), then fetches that page and the `pageCount`:

```tsx
// app/(admin)/orders/page.tsx
const page = Number((await searchParams).page ?? '1');

<Pagination
  label={`Page ${page} of ${pageCount}`}
  hasPrevious={page > 1}
  hasNext={page < pageCount}
  previousURL={`/orders?page=${page - 1}`}
  nextURL={`/orders?page=${page + 1}`}
/>
```

Previous and next record on a detail page, through `Page`. This also works from a Server Component:

```tsx
<Page
  title="#1020"
  backAction={{ content: 'Orders', url: '/orders' }}
  pagination={{ hasPrevious: true, hasNext: true, previousURL: '/orders/1019', nextURL: '/orders/1021' }}
>
  <Card title="Unfulfilled">Mid-century armchair × 1</Card>
</Page>
```

Local page state with a range label (Client Component):

```tsx
'use client';
const pageSize = 50;
const total = 1284;
const [page, setPage] = React.useState(1);
const from = (page - 1) * pageSize + 1;
const to = Math.min(page * pageSize, total);

<Pagination
  label={`${from}–${to} of ${total.toLocaleString('en-US')}`}
  hasPrevious={page > 1}
  hasNext={to < total}
  onPrevious={() => setPage(page - 1)}
  onNext={() => setPage(page + 1)}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `hasPrevious` | `boolean` | — | The Previous button is disabled unless this is true. |
| `hasNext` | `boolean` | — | The Next button is disabled unless this is true. |
| `previousURL` | `string` | — | Renders Previous as a link while `hasPrevious` is true. |
| `nextURL` | `string` | — | Renders Next as a link while `hasNext` is true. |
| `onPrevious` | `() => void` | — | Client Components only. With `previousURL`, it runs on the link click. |
| `onNext` | `() => void` | — | Client Components only. With `nextURL`, it runs on the link click. |
| `label` | `ReactNode` | — | Semibold text between the buttons. |
| `className` | `string` | — | |

## Server Components
Pagination is not a client component. With `previousURL` / `nextURL` it works straight from a Server Component, including through `Page` and `IndexTable`. `onPrevious` / `onNext` need a Client Component.

## Accessibility
- Pagination renders `<nav aria-label="Pagination">`. Its arrows are buttons, or links when they have a URL, labelled "Previous" and "Next".
- Disabled buttons use `bg-fill-disabled` and `icon-disabled`.
