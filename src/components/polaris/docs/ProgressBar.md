# ProgressBar

Shows the progress of a determinate task as a filled track (`bg-fill-tertiary` track, toned fill).

```tsx
import { ProgressBar } from '@/components/polaris';
```

## Use it for
- Tasks with a known end: imports, setup guides, goals. For unknown durations use `Spinner` or skeletons.
- Always pair it with text that states what is progressing ("3 of 5 tasks complete", "Importing products: 620 of 1,240"), and name the bar with `accessibilityLabel`.
- Sizes: `small` 8px (inside cards and lists), `medium` 16px (default), `large` 32px.
- Tones: `highlight` (default, `bg-fill-info`), `primary` (`bg-fill-brand`), `success` when complete, `critical` when failing.

## Examples

Setup guide in a card:

```tsx
<Card title="Setup guide">
  <span>3 of 5 tasks complete</span>
  <ProgressBar progress={60} size="small" tone="primary" accessibilityLabel="Setup progress" />
</Card>
```

Import progress — pass a new `progress` and the fill eases to it over 500ms:

```tsx
<div>
  <p>{`Importing products: ${imported} of ${total}`}</p>
  <ProgressBar
    progress={(imported / total) * 100}
    tone={imported === total ? 'success' : 'highlight'}
    accessibilityLabel="Product import progress"
  />
</div>
```

Static value in a dense list — `animated={false}` turns off the width transition:

```tsx
<ProgressBar progress={64} size="small" tone="success" animated={false} accessibilityLabel="Monthly sales goal" />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `progress` | `number` | — | Required. 0–100; values outside are clamped. |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 8 / 16 / 32px tall. |
| `tone` | `'highlight' \| 'primary' \| 'success' \| 'critical'` | `'highlight'` | Fill color. |
| `animated` | `boolean` | `true` | Width eases over 500ms unless `false`. |
| `accessibilityLabel` | `string` | — | Names the bar for screen readers ("Setup progress"). |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Not a client component: render it from a Server Component with a computed `progress`; re-render with a new value (e.g. from polling in a Client Component) to animate.

## Accessibility
- Renders `role="progressbar"` with `aria-valuemin` 0, `aria-valuemax` 100, `aria-valuenow` and `aria-label` from `accessibilityLabel` — always pass one.
- Keep the visible text too; the label names the bar but doesn't say "3 of 5".
