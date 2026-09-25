# ExceptionList

A compact list of notable exceptions about an order or customer: a dot or icon, an optional bold title and a description.

```tsx
import { ExceptionList } from '@/components/polaris';
```

## Use it for
- Calling out risk and anomalies inside cards and resource list items: fraud risk, mismatched addresses, notes that need attention.
- `status: 'critical'` or `'warning'` colors the whole row (`text-critical` / `text-warning` with matching `icon-*`); leave it off for neutral facts in `text-secondary`.
- Short rows: a title of a few words, then one sentence of description.

## Examples

Order risk in a card:

```tsx
<Card title="Fraud analysis">
  <ExceptionList
    items={[
      { status: 'critical', icon: 'AlertMinor', title: 'High risk of fraud.', description: 'Review the order before you fulfill it.' },
      { status: 'warning', icon: 'RiskMinor', title: 'Mismatched address.', description: 'Billing and shipping addresses differ.' },
      { description: 'Payment was made with a card saved to the customer’s account.' },
    ]}
  />
</Card>
```

Descriptions can hold links and other nodes:

```tsx
<ExceptionList
  items={[
    { icon: 'NotesMinor', description: 'Prefers delivery after 5 pm.' },
    {
      icon: 'ClockMinor',
      description: (
        <>
          Last order <Link url="/orders/1019">#1019</Link> placed 3 days ago
        </>
      ),
    },
  ]}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `ExceptionListItem[]` | — | Required. One row per item. |
| `items[].status` | `'warning' \| 'critical'` | — | Colors the row, icon and dot. |
| `items[].icon` | `IconSource` | dot | Without an icon a small 6px dot shows. |
| `items[].title` | `string` | — | Semibold lead-in, followed by a space. |
| `items[].description` | `ReactNode` | — | The rest of the row. |
| `className` | `string` | — | Extra classes on the `ul`. |

## Server Components
Not a client component: render it anywhere.

## Accessibility
- Renders a `ul`; icons are decorative, so the text must carry the meaning ("High risk of fraud.", not just a red icon).
