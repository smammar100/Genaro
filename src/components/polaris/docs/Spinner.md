# Spinner

An indeterminate loading indicator in `bg-fill-brand`.

```tsx
import { Spinner } from '@/components/polaris';
```

## Use it for
- Loading a whole page or section: the default `large` size, centered in the space the content will fill.
- Inline status next to text with `size="small"`.
- Not inside buttons — use `Button loading`, which renders its own small spinner and disables the button.
- When you know the layout that's coming, prefer skeletons (`SkeletonBodyText` and friends); when you know the percentage, use `ProgressBar`.

## Examples

A route's `loading.tsx` (Server Component):

```tsx
// app/orders/loading.tsx
export default function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-1600)' }}>
      <Spinner accessibilityLabel="Loading orders" />
    </div>
  );
}
```

`Suspense` fallback for one card — `RecentOrders` is an async Server Component:

```tsx
<Card title="Recent orders">
  <Suspense fallback={<Spinner size="small" accessibilityLabel="Loading recent orders" />}>
    <RecentOrders />
  </Suspense>
</Card>
```

Inline status:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-200)' }}>
  <Spinner size="small" accessibilityLabel="Syncing inventory" />
  <span>Syncing inventory with 3 locations…</span>
</div>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `size` | `'small' \| 'large'` | `'large'` | `large` renders 40px (`space-1000`) for sections; `small` 20px for inline use. |
| `accessibilityLabel` | `string` | `'Loading'` | What is loading: "Loading orders". |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Not a client component: use it directly in `loading.tsx`, `Suspense` fallbacks and Server Components.

## Accessibility
- Renders `role="status"` with `aria-label` — name what is loading rather than keeping the generic "Loading".
- Under `prefers-reduced-motion` the rotation slows from 500ms to 1.5s per turn.
