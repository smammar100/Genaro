# Filters

Search and filter controls for index lists: a query field plus filter pills. `FilterPill` is the single pill, exported for building your own filter bar.

```tsx
import { Filters, FilterPill } from '@/components/polaris';
```

## Use it for
- The top of an `IndexTable` or `ResourceList` card. `IndexTable` takes the same props through `filters={{ … }}` (shown when its search button is pressed; `filtersOpen` starts it open); `ResourceList` takes a `<Filters />` element in `filterControl`.
- Applied filters show as filled pills with a remove ×, labelled with the condition: "Status is Unfulfilled", "Tagged with Wholesale". Available filters show as outline pills with a chevron, followed by an "Add filter" pill and, when anything is applied, "Clear all".
- Give each filter an `onClick` that opens your filter UI (e.g. a `Modal` with a `ChoiceList`), and `onAddFilterClick` for the "Add filter" pill. For a dropdown anchored under the pill, compose your own bar from `FilterPill` + `Popover` (second example) — `Filters` can't anchor a `Popover` to its own pills.
- `magic` on a `FilterPill` only while Sidekick is building the filter.

## Examples

Controlled search with one applied filter (Client Component; `openFilter` / `openFilterPicker` open your filter UI). The × in the field calls `onQueryClear`, not `onQueryChange`:

```tsx
'use client';
const [query, setQuery] = React.useState('');
const [status, setStatus] = React.useState<string | null>('Unfulfilled');

<Filters
  queryValue={query}
  onQueryChange={setQuery}
  onQueryClear={() => setQuery('')}
  queryPlaceholder="Searching all orders"
  filters={[
    { key: 'status', label: 'Status', onClick: () => openFilter('status') },
    { key: 'tagged', label: 'Tagged with', onClick: () => openFilter('tagged') },
    { key: 'vendor', label: 'Vendor', onClick: () => openFilter('vendor') },
  ]}
  appliedFilters={status ? [{ key: 'status', label: `Status is ${status}`, onRemove: () => setStatus(null) }] : []}
  onAddFilterClick={openFilterPicker}
  onClearAll={() => setStatus(null)}
/>
```

Advanced — a pill with an anchored dropdown: `FilterPill` opens a `Popover` with a `ChoiceList`, and turns into an applied pill once values are chosen:

```tsx
'use client';
const [open, setOpen] = React.useState(false);
const [vendors, setVendors] = React.useState<string[]>([]);
const toggle = () => setOpen((o) => !o);

<Popover
  active={open}
  onClose={() => setOpen(false)}
  sectioned
  activator={
    vendors.length ? (
      <FilterPill label={`Vendor is ${vendors.join(', ')}`} active onClick={toggle} onRemove={() => setVendors([])} />
    ) : (
      <FilterPill label="Vendor" onClick={toggle} />
    )
  }
>
  <ChoiceList
    title="Vendor"
    titleHidden
    allowMultiple
    choices={[
      { label: 'Jaded Pixel', value: 'Jaded Pixel' },
      { label: 'Oak & Iron', value: 'Oak & Iron' },
      { label: 'Nordic Home', value: 'Nordic Home' },
    ]}
    selected={vendors}
    onChange={setVendors}
  />
</Popover>
```

## Props

**Filters**

| Prop | Type | Default | Notes |
|---|---|---|---|
| `queryValue` | `string` | — | Controlled search text; omit to leave the field uncontrolled. |
| `onQueryChange` | `(value: string) => void` | — | Called as the merchant types. |
| `onQueryClear` | `() => void` | — | Called by the field's ×; reset `queryValue` here. |
| `queryPlaceholder` | `string` | `'Filter items'` | e.g. "Searching all orders". |
| `filters` | `FilterDefinition[]` | — | `{ key, label, onClick? }` — outline pills unless applied (matched by `key`); `onClick` opens your filter UI. |
| `appliedFilters` | `AppliedFilter[]` | — | `{ key, label, onRemove? }` — filled pills with a ×. |
| `onClearAll` | `() => void` | — | The "Clear all" button, shown while any filter is applied. |
| `onAddFilterClick` | `() => void` | — | Called by the "Add filter" pill. |
| `className` | `string` | — | Extra classes on the root (layout only). |

**FilterPill**

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | Required. |
| `active` | `boolean` | — | Applied style with a × ("Remove {label}"); no chevron. |
| `add` | `boolean` | — | "Add filter" style with a plus icon. |
| `onClick` | `() => void` | — | Clicking the pill (open your picker here). |
| `onRemove` | `() => void` | — | Clicking the × of an `active` pill. |
| `magic` | `boolean` | — | Sidekick state. |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Neither is a client component, but the search field is a client `TextField` and every callback (`onClick`, `onRemove`, `onQueryChange`…) needs a Client Component — from a Server Component, `Filters` only displays inert pills and an uncontrolled field that can't be read (it has no `name`).

## Accessibility
- The search field is labelled "Search" (visually hidden) and has the `SearchMinor` prefix; applied pills' × buttons are labelled "Remove {label}".
