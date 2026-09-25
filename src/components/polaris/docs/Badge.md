# Badge

A compact pill that shows the status of an object — product status, payment, fulfillment (the file's Badge set: tones × progress × strong).

```tsx
import { Badge, type BadgeTone } from '@/components/polaris';
```

## Use it for
- System status only, in one or two words that are adjectives or past participles: Active, Draft, Unfulfilled, Partially paid. Merchant-entered keywords are `Tag`s.
- Tones by urgency: `attention` (yellow) needs action soon, `warning` (orange) marks a problem, `critical` (red) needs immediate action; `success` for done/healthy, `info` for scheduled or informational, neutral (default) for inactive states.
- `progress` pips on payment and fulfillment states: `incomplete` (Unfulfilled, Payment pending), `partiallyComplete`, `complete` (Paid, Fulfilled).
- `strong` for the rare badge that must stand out (Overdue); `magic` / `new` only for Sidekick and new-feature labels.

## Examples

Payment and fulfillment status on an order:

```tsx
<div style={{ display: 'flex', gap: 'var(--space-100)' }}>
  <Badge tone="success" progress="complete">
    Paid
  </Badge>
  <Badge tone="warning" progress="partiallyComplete">
    Partially paid
  </Badge>
  <Badge tone="attention" progress="incomplete">
    Unfulfilled
  </Badge>
  <Badge progress="complete">Fulfilled</Badge>
</div>
```

Map your data to a label and tone once, typed with `BadgeTone`:

```tsx
const PRODUCT_STATUS: Record<'active' | 'draft' | 'archived', { label: string; tone?: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  draft: { label: 'Draft', tone: 'info' },
  archived: { label: 'Archived' },
};

export function ProductStatusBadge({ status }: { status: keyof typeof PRODUCT_STATUS }) {
  const { label, tone } = PRODUCT_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
```

Strong, with an icon, and large:

```tsx
<div style={{ display: 'flex', gap: 'var(--space-100)' }}>
  <Badge tone="critical" strong>
    Overdue
  </Badge>
  <Badge tone="info" icon="ClockMinor">
    Scheduled
  </Badge>
  <Badge tone="new" size="large">
    New
  </Badge>
</div>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | One or two status words. |
| `tone` | `'neutral' \| 'info' \| 'success' \| 'attention' \| 'warning' \| 'critical' \| 'magic' \| 'new'` | `'neutral'` | Exported as `BadgeTone`. `magic` and `new` share the purple fill. |
| `progress` | `'incomplete' \| 'partiallyComplete' \| 'complete'` | — | Leading progress pip. Exported as `BadgeProgress`. |
| `strong` | `boolean` | — | Solid fill for info, success, attention, warning, critical (e.g. `bg-fill-critical`); neutral only darkens the text; no effect on `magic`/`new`. |
| `size` | `'medium' \| 'large'` | `'medium'` | `large`: 13px text and 4px vertical padding. |
| `icon` | `IconSource` | — | Leading icon name (`'ClockMinor'`) or element. |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Not a client component: render it anywhere, including from Server Components and inside `Page` `titleMetadata` or table cells.

## Accessibility
- The progress pip is decorative (`aria-hidden`), so the words must carry the status — never rely on color or the pip alone.
