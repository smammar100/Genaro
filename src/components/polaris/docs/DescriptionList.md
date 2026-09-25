# DescriptionList

Term–description pairs in two equal columns, separated by `border-secondary` rules.

```tsx
import { DescriptionList } from '@/components/polaris';
```

## Use it for
- Read-only details inside a card, such as shipping details, customer information or a settings summary.
- Terms are semibold, and descriptions take any node: text, a `Link` or a `Badge`.
- Rows are padded 16px top and bottom (`space-400`). `gap="tight"` reduces that to 8px (`space-200`).
- There's no rule above the first row, so the list sits cleanly under a card title.
- For right-aligned amounts such as order totals, use a DataTable instead. DescriptionList splits the width 50/50.

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
| `className` | `string` | — | Extra classes on the `<dl>`. |

## Server Components
DescriptionList is not a client component and renders anywhere.

## Accessibility
- It renders a semantic `<dl>` with `<dt>` / `<dd>` pairs, so screen readers announce each term with its description.
