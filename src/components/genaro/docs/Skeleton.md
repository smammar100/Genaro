# Skeleton

Pulsing placeholders shown while content loads: `SkeletonDisplayText` for headings, `SkeletonBodyText` for paragraphs, `SkeletonThumbnail` for images, and `SkeletonBox` for any other shape.

```tsx
import { SkeletonBodyText, SkeletonBox, SkeletonDisplayText, SkeletonThumbnail } from '@/components/genaro';
```

## Use it for
- `loading.tsx` files and `Suspense` fallbacks, when you know the shape of what's coming. Use `Spinner` when you don't.
- Mirror the real layout: same cards, same order, similar line counts, so nothing jumps when content arrives.
- Match `SkeletonDisplayText` `size` to the heading it replaces, and `SkeletonThumbnail` `size` to the `Thumbnail` that follows.
- `SkeletonBodyText` shortens its last line (80%) so it reads as the end of a paragraph.
- `SkeletonBox` for the rest: a chart, a map, a photo, a kanban card, a short label. Reach for the text and thumbnail skeletons first; they already match the kit's type and image sizes.
- Give a `SkeletonBox` the size and `radius` of what it replaces: `height={288} radius="300"` for a chart in a card, `aspectRatio="4 / 3"` for a photo tile, `width={96} height={12}` for a short label. It fills the width unless you set `width`; numbers are pixels, strings any CSS length. Tailwind sizes in `className` (`h-72`, `w-24`) work too.

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

Shapes the text skeletons don't cover, with `SkeletonBox` — a chart card and a grid of photo tiles:

```tsx
<Card title="Sales by month">
  <SkeletonBox height={288} radius="300" />
</Card>

<div className="grid grid-cols-3 gap-3" aria-busy="true">
  {Array.from({ length: 6 }, (_, i) => (
    <SkeletonBox key={i} aspectRatio="4 / 3" />
  ))}
</div>
```

## Props

| Component | Prop | Type | Default | Notes |
|---|---|---|---|---|
| `SkeletonDisplayText` | `size` | `'small' \| 'medium' \| 'large' \| 'extraLarge'` | `'medium'` | 24 / 28 / 28 / 36px tall, max 120–240px wide. |
| `SkeletonBodyText` | `lines` | `number` | `3` | 8px bars, 12px apart. |
| `SkeletonThumbnail` | `size` | `'extraSmall' \| 'small' \| 'medium' \| 'large'` | `'medium'` | 24 / 40 / 60 / 80px, same as `Thumbnail`. |
| `SkeletonBox` | `width` | `number \| string` | full width | Pixels, or any CSS length (`'50%'`, `'var(--space-1600)'`). |
| `SkeletonBox` | `height` | `number \| string` | `20` | Pixels, or any CSS length. Ignored with `aspectRatio`. |
| `SkeletonBox` | `radius` | `'0' \| '050' \| '100' \| '150' \| '200' \| '300' \| '400' \| '500' \| '750' \| 'full'`, or a length | `'200'` | A step names a `--radius-*` token. |
| `SkeletonBox` | `aspectRatio` | `number \| string` | — | `'4 / 3'`, `1`… The height follows the width. |
| all four | `className` | `string` | — | Extra classes on the root (layout only; Tailwind sizes work on `SkeletonBox`). |

## Server Components
None of them is a client component: use them directly in `loading.tsx`, `Suspense` fallbacks and Server Components.

## Accessibility
- They are empty `div`s with no ARIA. If assistive tech should know the region is loading, set `aria-busy="true"` on its container yourself.
- The pulse animation stops under `prefers-reduced-motion`.
