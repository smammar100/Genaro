# EmptyStateIllustration

A ghosted miniature of the screen once it has content, with the first item landing where it will appear. It goes in EmptyState's `illustration` slot.

```tsx
import { EmptyState, EmptyStateIllustration } from '@/components/genaro';
```

## Use it for
- Every page- and card-level empty state: first use, no results, no access, not found and errors. Pick the `variant` that matches the screen, not the topic: Completed sales is a `list`, the pipeline a `kanban`.
- `plates` on lists of vehicles (stock, master sheet, completed sales, returns, and searches over cars): each row leads with a reg plate.
- `size="small"` inside a card, with `<EmptyState compact>`.
- Not for one-line messages inside a list, a dropdown or a picker: those stay text.

## Variants

| `variant` | For | What moves |
|---|---|---|
| `list` | Tables and lists (stock, invoices, warranties, vendors, returns) | The first row rises into its dashed slot |
| `kanban` | Boards (pipeline, maintenance, prep) | A card glides into the first lane |
| `calendar` | Calendars and appointment lists | A booking pops into the week |
| `gallery` | Photos | Photos drop into the first tiles |
| `checklist` | Inspections and sale-ready steps | Each point ticks, the progress bar fills |
| `timeline` | Activity | A new entry lands at the top |
| `search` | No results | The rows dim as the lens sweeps |
| `lock` | No access | The screen is frosted; the shackle drops shut |
| `notFound` | A missing record or page | A row drifts out of its outline |
| `error` | Something went wrong | One row turns critical; retry turns |
| `chart` | Reports and performance | Bars grow under the dashed line |
| `detail` | A single record (a listing) | The Live pill appears |

## Example

```tsx
<EmptyState
  illustration={<EmptyStateIllustration variant="list" plates />}
  heading="No vehicles in stock"
  action={{ content: 'Add vehicle', url: '/inventory/add-vehicle' }}
>
  Add a vehicle by its registration to start tracking it.
</EmptyState>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'list' \| 'kanban' \| 'calendar' \| 'gallery' \| 'checklist' \| 'timeline' \| 'search' \| 'lock' \| 'notFound' \| 'error' \| 'chart' \| 'detail'` | — | The kind of screen that is empty. |
| `size` | `'medium' \| 'small'` | `'medium'` | 280px on a page, 200px in a card. |
| `plates` | `boolean` | `false` | Leads each list row with a reg plate. |
| `className` | `string` | — | Extra classes on the `svg` (layout only). |

## Motion
The frame and rows rise in (460ms, staggered), then the first item lands on a 4.6s loop. With `prefers-reduced-motion` nothing moves and the drawing rests with the item landed. The drawing is decorative (`aria-hidden`); the EmptyState heading and body carry the meaning.

## Server Components
A client component (it uses `useId` for its mask). It renders fine inside EmptyState from a Server Component.
