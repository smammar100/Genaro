# Page

The page header plus the content column below it. The header can hold a back button, a title with badges, a subtitle, secondary and primary actions, and pagination. The content column has a constrained width.

```tsx
import { Page } from '@/components/polaris';
```

## Use it for
- Every admin route. `app/(admin)/layout.tsx` renders the Frame shell (see Frame), and each `page.tsx` returns one Page. For a full index page built this way, see `kit/examples/orders/OrdersIndex.tsx`.
- Widths: the default is 998px, for detail pages. `narrowWidth` is 662px, for settings. `fullWidth` has no maximum, for index pages with an `IndexTable`.
- On detail pages, set `backAction={{ content: 'Orders', url: '/orders' }}`. Its `content` becomes the back button's accessible label.
- Use one `primaryAction`. `secondaryActions` render as `bg-fill-tertiary` pills, not bevelled buttons. `destructive` gives them the critical tone. An icon-only action needs `icon` plus `accessibilityLabel`. Every action (including `backAction`) takes an optional `id`, rendered on its button or link, for anchors such as an onboarding-tour step.
- `titleMetadata` holds status badges, `subtitle` holds the date or source, and `titlePicker` is a heading-sized dropdown button such as "All locations". `pagination` moves to the previous or next record; give it `previousURL` / `nextURL` so it works from a Server Component.
- Children stack 16px apart (`space-400`). Page supplies the side margins (24px, or 16px when the page is narrower than 768px), so don't pad its content yourself.
- When the Page is narrower than 768px, the header stacks (title first, then actions), and flush cards or an IndexTable placed directly inside run edge to edge.
- The header only renders when `title` or `backAction` is set. Actions and pagination on a Page without either are not shown.
- Keep pages as Server Components and put state in small client components ("client islands"). The kit's example screens do this with `kit/examples/_lib/interactive.tsx`, which provides `TagList`, `DismissibleBanner` and `DismissibleCalloutCard`.

## Examples

An index page as a Server Component. The primary action is a `url`, and the rows link to their detail pages:

```tsx
// app/(admin)/orders/page.tsx
import { Badge, IndexTable, Page } from '@/components/polaris';

export default function OrdersPage() {
  return (
    <Page title="Orders" fullWidth primaryAction={{ content: 'Create order', url: '/orders/new' }}>
      <IndexTable
        selectable={false}
        headings={[{ title: 'Order' }, { title: 'Customer' }, { title: 'Total', alignment: 'end' }, { title: 'Payment status' }]}
        rows={[
          { id: '1020', url: '/orders/1020', cells: ['#1020', 'Jaydon Stanton', '$969.44', <Badge tone="success" progress="complete">Paid</Badge>] },
          { id: '1019', url: '/orders/1019', cells: ['#1019', 'Ruben Westerfelt', '$701.19', <Badge tone="warning" progress="partiallyComplete">Partially paid</Badge>] },
        ]}
      />
    </Page>
  );
}
```

A detail page with a back action, status badges, a subtitle, link and icon-only secondary actions, and previous/next record links. All of it works in a Server Component:

```tsx
// app/(admin)/orders/[id]/page.tsx
import { Badge, Card, Layout, Page } from '@/components/polaris';

export default function OrderPage() {
  return (
    <Page
      title="#1020"
      backAction={{ content: 'Orders', url: '/orders' }}
      titleMetadata={
        <>
          <Badge tone="success" progress="complete">Paid</Badge>
          <Badge tone="attention" progress="incomplete">Unfulfilled</Badge>
        </>
      }
      subtitle="July 20, 2024 at 4:34 pm from Online Store"
      secondaryActions={[
        { content: 'Refund', url: '/orders/1020/refund' },
        { content: 'Edit', url: '/orders/1020/edit' },
        { icon: 'PrintMajor', accessibilityLabel: 'Print order', url: '/orders/1020/print' },
      ]}
      pagination={{ hasPrevious: true, hasNext: true, previousURL: '/orders/1019', nextURL: '/orders/1021' }}
    >
      <Layout>
        <Layout.Section>
          <Card title="Unfulfilled">Mid-century armchair × 1</Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card title="Customer">Jaydon Stanton</Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
```

Actions that run code, such as a primary action with a loading state, need a Client Component:

```tsx
'use client';
const [saving, setSaving] = React.useState(false);

<Page
  title="Mid-century armchair"
  backAction={{ content: 'Products', url: '/products' }}
  titleMetadata={<Badge tone="success">Active</Badge>}
  secondaryActions={[{ content: 'Duplicate', icon: 'DuplicateMinor', url: '/products/new?duplicate=2' }]}
  primaryAction={{ content: 'Save', loading: saving, onAction: () => setSaving(true) }}
>
  <Card title="Title">Mid-century armchair</Card>
</Page>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | — | The page's `<h1>`, set in `heading-lg` (20/24). |
| `subtitle` | `string` | — | 12px `text-secondary` line under the title. |
| `titleMetadata` | `ReactNode` | — | Badges beside the title, 8px apart. |
| `titlePicker` | `Action` | — | Heading-sized dropdown button after the title. Only `content` and `onAction` are used. |
| `backAction` | `Action` | — | Tertiary `ArrowLeftMinor` button. `content` is its label (default "Back"). |
| `primaryAction` | `Action & { disabled?: boolean; loading?: boolean }` | — | The one primary button. |
| `secondaryActions` | `PageSecondaryAction[]` | — | `{ content?, icon?, destructive?, disabled?, accessibilityLabel?, url?, onAction?, testId?, id? }`. |
| `pagination` | `PaginationProps` | — | Previous and next record, after the actions. Use `previousURL` / `nextURL`, or `onPrevious` / `onNext`. |
| `fullWidth` | `boolean` | — | No maximum width. |
| `narrowWidth` | `boolean` | — | Maximum width 662px. |
| `children` | `ReactNode` | — | Content column. |
| `className` | `string` | — | Extra classes on the root. |

## Server Components
Page is not a client component, so render it straight from `page.tsx`. Use `url` on `backAction`, `primaryAction` and `secondaryActions`, and `previousURL` / `nextURL` on `pagination`. `onAction` and `titlePicker` only do anything with callbacks, and callbacks must come from a Client Component. For those, render the Page from a small `'use client'` wrapper, as in the last example, and pass the server-rendered content through as `children`. Other interactive pieces go in client islands inside a server-rendered Page.

## Accessibility
- `title` is the page's only `<h1>`. Card titles are `<h2>`.
- Icon-only secondary actions need `accessibilityLabel`. The back button uses `backAction.content` as its label.
