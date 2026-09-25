# Skeleton

Pulsing placeholders shown while content loads: `SkeletonDisplayText` for headings, `SkeletonBodyText` for paragraphs, `SkeletonThumbnail` for images.

```tsx
import { SkeletonBodyText, SkeletonDisplayText, SkeletonThumbnail } from '@/components/polaris';
```

## Use it for
- `loading.tsx` files and `Suspense` fallbacks, when you know the shape of what's coming. Use `Spinner` when you don't.
- Mirror the real layout: same cards, same order, similar line counts, so nothing jumps when content arrives.
- Match `SkeletonDisplayText` `size` to the heading it replaces, and `SkeletonThumbnail` `size` to the `Thumbnail` that follows.
- `SkeletonBodyText` shortens its last line (80%) so it reads as the end of a paragraph.

## Examples

A detail page's `loading.tsx` (Server Component):

```tsx
// app/products/[id]/loading.tsx
export default function Loading() {
  return (
    <Card>
      <SkeletonDisplayText size="small" />
      <div style={{ display: 'flex', gap: 'var(--space-400)' }}>
        <SkeletonThumbnail size="large" />
        <div style={{ flex: 1 }}>
          <SkeletonBodyText lines={4} />
        </div>
      </div>
    </Card>
  );
}
```

List rows as a `Suspense` fallback — `ProductList` is an async Server Component:

```tsx
<Suspense
  fallback={
    <Card>
      {[1, 2, 3].map((row) => (
        <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-300)' }}>
          <SkeletonThumbnail size="small" />
          <div style={{ flex: 1 }}>
            <SkeletonBodyText lines={1} />
          </div>
        </div>
      ))}
    </Card>
  }
>
  <ProductList />
</Suspense>
```

## Props

| Component | Prop | Type | Default | Notes |
|---|---|---|---|---|
| `SkeletonDisplayText` | `size` | `'small' \| 'medium' \| 'large' \| 'extraLarge'` | `'medium'` | 24 / 28 / 28 / 36px tall, max 120–240px wide. |
| `SkeletonBodyText` | `lines` | `number` | `3` | 8px bars, 12px apart. |
| `SkeletonThumbnail` | `size` | `'extraSmall' \| 'small' \| 'medium' \| 'large'` | `'medium'` | 24 / 40 / 60 / 80px, same as `Thumbnail`. |
| all three | `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
None of them is a client component: use them directly in `loading.tsx`, `Suspense` fallbacks and Server Components.

## Accessibility
- They are empty `div`s with no ARIA. If assistive tech should know the region is loading, set `aria-busy="true"` on its container yourself.
- The pulse animation stops under `prefers-reduced-motion`.
