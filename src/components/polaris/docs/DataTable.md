# DataTable

A read-only table of numbers for reports and analytics, in a flush card, with an optional totals row and footer.

```tsx
import { DataTable } from '@/components/polaris';
```

## Use it for
- Comparing numeric data, such as sales by product, payouts or tax summaries. For lists of resources the merchant acts on (links, selection, bulk actions), use IndexTable.
- `columnContentTypes` sets each column to `'text'` or `'numeric'`. Numeric columns align right with tabular figures, and so do their headings and totals.
- `totals` adds a semibold row on `bg-surface-tertiary` directly under the headings. `showTotalsInFooter` moves it to the bottom. The first totals cell is always replaced by `totalsName` (default "Totals"), so pass `''` in that slot.
- `footerContent` adds a centered `text-secondary` note, such as "Showing 3 of 3 products".
- Cells don't wrap (`white-space: nowrap`), and the card scrolls horizontally when the columns are too wide. Keep text columns short.
- DataTable is already a flush card. Put it straight into a Page or a Layout section, not inside a `Card`. It has no sorting, selection or pagination.

## Examples

Sales by product, with totals under the headings:

```tsx
<DataTable
  columnContentTypes={['text', 'numeric', 'numeric', 'numeric']}
  headings={['Product', 'Price', 'Net quantity', 'Net sales']}
  rows={[
    ['Mid-century armchair', '$849.00', 64, '$54,336.00'],
    ['Teal table lamp', '$120.00', 140, '$16,800.00'],
    ['Ombre ceramic vase', '$48.00', 212, '$10,176.00'],
  ]}
  totals={['', '', 416, '$81,312.00']}
  footerContent="Showing 3 of 3 products"
/>
```

Payouts with linked dates, status badges, and a named totals row in the footer:

```tsx
<DataTable
  columnContentTypes={['text', 'text', 'numeric']}
  headings={['Payout date', 'Status', 'Amount']}
  rows={[
    [<Link url="/finances/payouts/1042">Jul 22, 2024</Link>, <Badge tone="success">Paid</Badge>, '$2,480.50'],
    [<Link url="/finances/payouts/1041">Jul 19, 2024</Link>, <Badge tone="success">Paid</Badge>, '$1,911.19'],
    [<Link url="/finances/payouts/1040">Jul 16, 2024</Link>, <Badge tone="info">In transit</Badge>, '$969.44'],
  ]}
  totals={['', '', '$5,361.13']}
  totalsName="Total"
  showTotalsInFooter
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `headings` | `ReactNode[]` | — | Required. One per column. |
| `rows` | `ReactNode[][]` | — | Required. Strings, numbers or elements. |
| `columnContentTypes` | `Array<'text' \| 'numeric'>` | all `'text'` | `numeric` right-aligns the column. |
| `totals` | `ReactNode[]` | — | One value per column. The first is replaced by `totalsName`. |
| `totalsName` | `string` | `'Totals'` | Label in the first totals cell. |
| `showTotalsInFooter` | `boolean` | — | Totals in a `<tfoot>` at the bottom instead of under the headings. |
| `footerContent` | `ReactNode` | — | Centered note below the table. |
| `className` | `string` | — | Extra classes on the card. |

## Server Components
DataTable is not a client component, so render it anywhere. Links in cells navigate client-side through `PolarisProvider`.

## Accessibility
- It renders a real `<table>` with `<th>` headings, so keep headings short and specific ("Net sales", not "Amount").
