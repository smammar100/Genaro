# Divider

A 1px horizontal rule (`<hr>`) that separates sections inside a card.

```tsx
import { Divider } from '@/components/polaris';
```

## Use it for
- Dividing sections within a card, such as a summary from its totals. Don't use it between cards; the gap between cards already separates them.
- The default color is `border-secondary`. `borderColor="border"` gives a stronger line, and `border-inverse` is for dark surfaces.
- It spans the full width of its container and has no margin of its own. In a Card, the card's 8px gap spaces it from its neighbours.
- In a flush card (`padding="0"`) it runs edge to edge, so pad the sections, not the divider.

## Examples

Between sections of a card:

```tsx
<Card title="Paid">
  <div>Subtotal: 2 items, $949.44</div>
  <div>Shipping: $20.00</div>
  <div>Total: $969.44</div>
  <Divider />
  <div>Paid by customer: $969.44</div>
</Card>
```

Edge to edge in a flush card, with a stronger line:

```tsx
<Card padding="0">
  <div style={{ padding: 'var(--space-400)' }}>Mid-century armchair × 1</div>
  <Divider borderColor="border" />
  <div style={{ padding: 'var(--space-400)' }}>Teal table lamp × 2</div>
</Card>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `borderColor` | `'border' \| 'border-secondary' \| 'border-inverse'` | `'border-secondary'` | Token for the 1px (`border-width-025`) line. |
| `className` | `string` | — | Extra classes, e.g. for margins. |

## Server Components
Divider is not a client component and renders anywhere.
