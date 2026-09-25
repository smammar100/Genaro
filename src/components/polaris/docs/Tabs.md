# Tabs

Switches between views of the same content, such as All · Unfulfilled · Unpaid, using pill tabs on transparent fills.

```tsx
import { Tabs } from '@/components/polaris';
```

## Use it for
- Saved views and sub-views of one list or card. `IndexTable` draws its own Tabs from its `tabs` prop, so use standalone Tabs elsewhere, for example above a ResourceList or inside a Card.
- Labels of one or two words. `badge` adds a count ("Unfulfilled 12").
- Tabs never shrink or wrap their labels. When there are more than fit, the tab list scrolls sideways.
- The selected tab uses `bg-fill-transparent-selected` with `text`. Other tabs use `text-brand`, and `text-brand-hover` on hover.
- `fitted` makes the tabs share the full width equally, which suits tabs inside a card.
- `actions` shows a `ChevronDownMinor` disclosure on the selected tab, the place for saved-view actions such as rename or duplicate. It is only the chevron: menu items you pass aren't rendered, and there is no click hook.
- `canCreateNewView` adds a tertiary "+" button (`PlusMinor`, labelled "Create new view"), which calls `onCreateNewView`. Open your "Create view" Modal from it.
- Tabs have no URLs. To keep the current view in the URL, call `router.push()` from `onSelect`.

## Examples

Controlled views with a "+" for new views (Client Component):

```tsx
'use client';
const [selected, setSelected] = React.useState(0);
const [creatingView, setCreatingView] = React.useState(false); // opens a "Create view" Modal

<Tabs
  tabs={[
    { id: 'all', content: 'All', actions: true },
    { id: 'unfulfilled', content: 'Unfulfilled', badge: 12 },
    { id: 'unpaid', content: 'Unpaid' },
    { id: 'archived', content: 'Archived' },
  ]}
  selected={selected}
  onSelect={setSelected}
  canCreateNewView
  onCreateNewView={() => setCreatingView(true)}
/>
```

The view kept in the URL. The page (a Server Component) reads `?view=` and passes it down:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Tabs } from '@/components/polaris';

const views = ['all', 'unfulfilled', 'unpaid'];

export function OrderViewTabs({ view }: { view: string }) {
  const router = useRouter();
  return (
    <Tabs
      tabs={[{ content: 'All' }, { content: 'Unfulfilled' }, { content: 'Unpaid' }]}
      selected={Math.max(0, views.indexOf(view))}
      onSelect={(index) => router.push(`/orders?view=${views[index]}`)}
    />
  );
}
```

Fitted tabs inside a card:

```tsx
'use client';
const [metric, setMetric] = React.useState(0);

<Card>
  <Tabs fitted tabs={[{ content: 'Sales' }, { content: 'Orders' }, { content: 'Sessions' }]} selected={metric} onSelect={setMetric} />
</Card>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `tabs` | `TabDescriptor[]` | — | Required. Each is `{ id?, content, badge?, actions? }`. |
| `selected` | `number` | — | Controlled index. Without it, Tabs tracks its own selection, starting at 0. |
| `onSelect` | `(index: number) => void` | — | Client Components only. |
| `fitted` | `boolean` | — | Equal-width tabs across the container. |
| `canCreateNewView` | `boolean` | — | Shows the "+" button. |
| `onCreateNewView` | `() => void` | — | Called by the "+" button. Client Components only. |
| `className` | `string` | — | |

`TabDescriptor`: `id` (used as the React key), `content` (the label, required), `badge` (`string | number`), `actions` (`boolean | MenuItem[]`, which shows the chevron on the selected tab only).

## Server Components
Tabs is a client component. Rendered from a Server Component, it still switches visually, but nothing else finds out which tab is selected. Pass `onSelect` from a Client Component.

## Accessibility
- Tabs render as a `role="tablist"` of `role="tab"` buttons with `aria-selected`.
- There is no `aria-controls` and no arrow-key navigation, so tabs are reached with the Tab key.
