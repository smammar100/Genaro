# Card

A white `bg-surface` container that groups related content and actions, with 12px corners, `shadow-100` and 16px padding (`space-card-padding`).

```tsx
import { Card } from '@/components/polaris';
```

## Use it for
- One topic per card. Split long forms across several cards. `Page` content and `Layout` sections stack cards 16px apart (`space-card-gap`).
- `title` (`heading-sm`, rendered as an `<h2>`) and `actions` (usually plain Buttons) form a header row. The card's children stack 8px apart (`space-200`).
- `background="subdued"` (`bg-surface-secondary`) for secondary content such as tips or summaries.
- `padding="0"` for flush tables, lists and media. It also clips children to the rounded corners. `IndexTable`, `DataTable`, `ResourceList` and `MediaCard` are already flush cards, so don't wrap them in a Card.
- When the Page is narrower than 768px, a flush card placed directly in the Page runs edge to edge.
- `roundedAbove="never"` for square corners.

## Examples

A title with a plain action. `url` buttons work from Server Components:

```tsx
<Card title="Customer" actions={<Button variant="plain" url="/customers/1053/edit">Edit</Button>}>
  <Link url="/customers/1053">Jaydon Stanton</Link>
  <div>3 orders · Ottawa, Canada</div>
</Card>
```

Stacked cards in a sidebar, with a subdued one for secondary information:

```tsx
<Layout.Section variant="oneThird">
  <Card title="Notes">Customer asked for delivery after 5 pm.</Card>
  <Card title="Conversion summary" background="subdued">
    This is their 3rd order.
  </Card>
</Layout.Section>
```

A flush card for media (no header, since the header would lose its padding too):

```tsx
<Card padding="0">
  <img src="/products/mid-century-armchair.jpg" alt="Mid-century armchair in mustard velvet" style={{ display: 'block', width: '100%' }} />
</Card>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | Stacked 8px apart. |
| `title` | `ReactNode` | — | Card heading (`heading-sm`, `<h2>`). |
| `actions` | `ReactNode` | — | Right side of the header, such as a plain `Button`. |
| `background` | `'default' \| 'subdued'` | `'default'` | `subdued` uses `bg-surface-secondary`. |
| `padding` | `'0' \| '400'` | `'400'` | `'0'` makes the card flush and sets `overflow: hidden`. |
| `roundedAbove` | `'never' \| 'always'` | — | `'never'` squares the corners. `'always'` looks the same as the default. |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Card is not a client component, so render it anywhere. Put `url` buttons in `actions` from Server Components. Buttons with `onClick` need a Client Component.

## Accessibility
- `title` renders an `<h2>` under the page's `<h1>`. Give each card a title unless its content is self-explanatory.
