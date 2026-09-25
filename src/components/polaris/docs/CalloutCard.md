# CalloutCard

A card that promotes a feature or a next step, with a title, short copy, an illustration and actions.

```tsx
import { CalloutCard } from '@/components/polaris';
```

## Use it for
- Onboarding and feature discovery, for example on the Home page. Use it sparingly: one callout per page.
- The title names the benefit ("Customize the style of your checkout"), and the children give one sentence of copy.
- `primaryAction` renders a default (secondary-style) Button and `secondaryAction` a tertiary one, so the page's own primary action stays the only primary. Labels are verb + noun.
- `illustration` is an image URL shown at 100 × 84px on the right (`object-fit: contain`, empty `alt`, so it's treated as decorative).
- `onDismiss` adds a `CancelSmallMinor` button (labelled "Dismiss card") in the top-right corner. Store the dismissal so the card stays hidden.
- It uses `shadow-200`, one step above a plain Card.

## Examples

Link actions, which render from a Server Component:

```tsx
<CalloutCard
  title="Customize the style of your checkout"
  illustration="/illustrations/checkout.svg"
  primaryAction={{ content: 'Customize checkout', url: '/settings/checkout' }}
  secondaryAction={{ content: 'Learn more', url: '/help/checkout-styles' }}
>
  Upload your store’s logo, change colors and fonts, and more.
</CalloutCard>
```

Dismissible (Client Component):

```tsx
'use client';
const [visible, setVisible] = React.useState(true);

{visible ? (
  <CalloutCard
    title="Sell in person with Point of Sale"
    illustration="/illustrations/point-of-sale.svg"
    primaryAction={{ content: 'Set up Point of Sale', url: '/point-of-sale' }}
    onDismiss={() => setVisible(false)}
  >
    Accept payments at markets and pop-ups with the same inventory as your online store.
  </CalloutCard>
) : null}
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | — | Required. `heading-sm`, rendered as an `<h2>`. |
| `children` | `ReactNode` | — | One sentence of copy. |
| `illustration` | `string` | — | Image URL, 100 × 84px. |
| `primaryAction` | `Action` | — | Default button. Supports `url`, `external`, `onAction` and `accessibilityLabel`. |
| `secondaryAction` | `Action` | — | Tertiary button. Only `content`, `url` and `onAction` are used, so `external` is ignored. |
| `onDismiss` | `() => void` | — | Shows the dismiss button. Client Components only. |
| `className` | `string` | — | Extra classes on the root. |

## Server Components
CalloutCard is not a client component. Render it from a Server Component with `url` actions. `onDismiss` and `onAction` need a Client Component.
