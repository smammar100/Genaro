# Thumbnail

A small product or file preview on `bg-surface-secondary` with a hairline `shadow-border-inset` edge.

```tsx
import { Thumbnail } from '@/components/polaris';
```

## Use it for
- Product images in line items, index tables and resource lists; file previews.
- Sizes: `extraSmall` 24 · `small` 40 · `medium` 60 (default) · `large` 80. Use `small` in dense rows.
- With no image, a subdued placeholder icon shows (`ProductsMinor` unless you pass another icon name) — so you can pass a possibly-missing image URL as is.
- Product photos keep their light studio backgrounds; the inset edge separates them from cards in dark mode too.

## Examples

A product image (installing the examples copies the sample photos to `/public/polaris/products/`):

```tsx
<Thumbnail source="/polaris/products/armchair.jpg" alt="Mid-century armchair" size="large" />
```

Line item — the image may be missing, and the adjacent title makes the image decorative (`alt` defaults to `''`):

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-300)' }}>
  <Thumbnail source={product.imageUrl} size="small" />
  <span>{product.title} × 2</span>
</div>
```

Your own image element as `children`, e.g. `next/image` (`import Image from 'next/image'`) — size it to the frame:

```tsx
<Thumbnail size="large">
  <Image src="/polaris/products/armchair.jpg" alt="Mid-century armchair" width={80} height={80} />
</Thumbnail>
```

An icon instead of an image:

```tsx
<Thumbnail source="NotesMinor" size="small" />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `source` | `string \| IconSource` | `'ProductsMinor'` | Image URL (plain `<img>`), or an icon name / element for a placeholder. |
| `alt` | `string` | `''` | For `source` images. Describe the image when no nearby text names it. |
| `children` | `ReactNode` | — | A custom image element rendered in the frame instead of `source`/`alt`. |
| `size` | `'extraSmall' \| 'small' \| 'medium' \| 'large'` | `'medium'` | 24 / 40 / 60 / 80px squares. |
| `className` | `string` | — | Extra classes on the root (layout only). |

Any `img` inside the frame is stretched to it with `object-fit: contain`. The frame isn't `position: relative`, so give `next/image` a `width`/`height` rather than `fill`.

## Server Components
Not a client component: render it anywhere — `children` can be a `next/image` from a Server Component.

## Accessibility
- Pass a real `alt` when the thumbnail stands alone; keep it empty when the product name is right next to it. Icon placeholders are always decorative.
