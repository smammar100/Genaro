# EmptyState

Explains why a page or section is empty and what to do next: a centered illustration or icon tile, heading, body and actions on its own card surface.

```tsx
import { EmptyState } from '@/components/polaris';
```

## Use it for
- First use of a page (no products, no orders yet) and "no results" after searching or filtering.
- The heading tells the merchant what they can do: "First up: what are you selling?". The body is one or two sentences.
- One primary `action`; a `secondaryAction` for alternatives such as importing. Labels are verb + noun.
- It draws its own card (`bg-surface`, `radius-300`, `shadow-100`) — don't wrap it in `Card`.

## Examples

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
| `image` | `string` | — | Illustration URL, shown at 226×226 with an empty `alt`. Takes precedence over `icon`. |
| `icon` | `IconSource` | — | Shown at 40px in a tinted tile when there's no `image`. |
| `action` | `Action` | — | Primary button: `{ content, url, external, onAction, accessibilityLabel }`. |
| `secondaryAction` | `Action` | — | Secondary button, placed left of the primary. |
| `footerContent` | `ReactNode` | — | Small `text-secondary` line under the actions. |
| `fullWidth` | `boolean` | — | Lets the text column grow past 400px. |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Not a client component: render it from a Server Component with `url` actions. `onAction` needs a Client Component.
