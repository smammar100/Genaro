# DescriptionList

Term–description pairs in two equal columns, separated by space. No rules between rows unless `divided` is set.

```tsx
import { DescriptionList } from '@/components/genaro';
```

## Use it for
- Read-only details inside a card, such as shipping details, customer information or a settings summary.
- Terms are semibold, and descriptions take any node: text, a `Link` or a `Badge`.
- Rows are padded 16px top and bottom (`space-400`). `gap="tight"` reduces that to 8px (`space-200`).
- Rows are separated by spacing alone. Set `divided` only when the rows truly can't be read without a rule (a long list of short values that run together); never above the first row, so the list sits cleanly under a card title.
- `descriptionAlign="end"` puts the values against the card's right edge, as on a deal's Customer, Deal and Vehicle cards, so a short label never runs into its value.
- For order totals with sums, use a DataTable instead. DescriptionList splits the width 50/50.

## Examples

Inside a card:

```tsx
<Card title="Shipping details">
  <DescriptionList
    items={[
      { term: 'Carrier', description: 'Canada Post' },
      { term: 'Service', description: 'Expedited Parcel' },
      { term: 'Tracking number', description: <Link url="/orders/1020/tracking">7023 2100 3941 4604</Link> },
      { term: 'Status', description: <Badge tone="attention" progress="incomplete">Unfulfilled</Badge> },
    ]}
  />
</Card>
```

Tight spacing for longer descriptions:

```tsx
<DescriptionList
  gap="tight"
  items={[
    { term: 'Logo', description: 'The logo that appears on the checkout page and in customer emails.' },
    { term: 'Brand colors', description: 'Colors used on buttons, links and accents.' },
    { term: 'Typography', description: 'Heading and body fonts.' },
  ]}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `Array<{ term: ReactNode; description: ReactNode }>` | — | Required. |
| `gap` | `'tight' \| 'loose'` | `'loose'` | Row padding: `loose` 16px, `tight` 8px. |
| `descriptionAlign` | `'start' \| 'end'` | `'start'` | `end` right-aligns the descriptions so values line up down a card's right edge. |
| `divided` | `boolean` | `false` | A `border-secondary` rule between rows. Only when spacing isn't enough. |
| `className` | `string` | — | Extra classes on the `<dl>`. |

## Server Components
DescriptionList is not a client component and renders anywhere.

## Accessibility
- It renders a semantic `<dl>` with `<dt>` / `<dd>` pairs, so screen readers announce each term with its description.
