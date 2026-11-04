# EmptyState

Explains why a page or section is empty and what to do next: a centered illustration, heading, body and actions on its own card surface.

```tsx
import { EmptyState } from '@/components/genaro';
```

## Use it for
- First use of a page (no products, no orders yet) and "no results" after searching or filtering.
- The heading tells the merchant what they can do: "First up: what are you selling?". The body is one or two sentences.
- One primary `action`; a `secondaryAction` for alternatives such as importing. Labels are verb + noun.
- It draws its own card (`bg-surface`, `radius-300`, `shadow-100`) — don't wrap it in `Card`.

- Illustrate it with an `EmptyStateIllustration` in the `illustration` slot: a ghosted miniature of the screen, with the first item landing in place (see its doc for which variant fits which screen). The icon tile is the fallback.
- Inside a card, set `compact` and give the illustration `size="small"`.

## Examples

The default, for every page in the app:

```tsx
<EmptyState
  illustration={<EmptyStateIllustration variant="list" plates />}
  heading="No vehicles in stock"
  action={{ content: 'Add vehicle', url: '/inventory/add-vehicle' }}
>
  Add a vehicle by its registration to start tracking it.
</EmptyState>
```

First use, with navigation actions — works from a Server Component:

```tsx
<EmptyState
  icon="ProductsMinor"
  heading="First up: what are you selling?"
  action={{ content: 'Add product', url: '/products/new' }}
  secondaryAction={{ content: 'Import products', url: '/products/import' }}
  footerContent="You can also sync products from another sales channel."
>
  Before you open your store, first you need some products.
</EmptyState>
```

No results, with an illustration and a client-side action (`clearFilters` resets your list state):

```tsx
<EmptyState
  image="/illustrations/empty-search.svg"
  heading="No orders found"
  action={{ content: 'Clear filters', onAction: clearFilters }}
>
  Try changing the filters or search term.
</EmptyState>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `heading` | `string` | — | Rendered as an `h2`. |
| `children` | `ReactNode` | — | Body text. |
| `illustration` | `ReactNode` | — | An `EmptyStateIllustration`. Takes precedence over `image` and `icon`. |
| `image` | `string` | — | Illustration URL, shown at 226×226 with an empty `alt`. Takes precedence over `icon`. |
| `icon` | `IconSource` | — | Shown at 40px in a tinted tile when there's no `image`. |
| `action` | `Action` | — | Primary button: `{ content, url, external, onAction, accessibilityLabel }`. |
| `secondaryAction` | `Action` | — | Secondary button, placed left of the primary. |
| `footerContent` | `ReactNode` | — | Small `text-secondary` line under the actions. |
| `fullWidth` | `boolean` | — | Lets the text column grow past 400px. |
| `compact` | `boolean` | — | Tighter padding, for an empty state inside a card. |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Not a client component: render it from a Server Component with `url` actions. `onAction` needs a Client Component.
