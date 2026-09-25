# OptionList

A list of options to pick from. A tick (`TickMinor`) marks the chosen item, and `allowMultiple` switches to checkboxes.

```tsx
import { OptionList } from '@/components/polaris';
```

## Use it for
- Pickers inside a `Popover`, such as inventory locations or sales channels. OptionList has no background of its own, so put it in a Popover (or a Card).
- A single list with an optional `title`. For groups, use `sections` (`[{ title, options }]`); `title` is ignored when `sections` is set.
- Control it with `selected` (an array of values) and `onChange(selected)`. Without `selected`, it keeps track of its own selection, starting from `defaultSelected`.
- In single mode, clicking an option replaces the selection with that option (clicking the current one keeps it). With `allowMultiple`, clicking toggles the option.
- The selected row gets `bg-surface-secondary-selected` and semibold text. `disabled` options use `text-disabled`.
- OptionList has no `name` and doesn't post with a form. Read the choice from `onChange`.

## Examples

A single choice (Client Component):

```tsx
'use client';
const [selected, setSelected] = React.useState(['centretown']);

<OptionList
  title="Inventory location"
  options={[
    { value: 'byward', label: 'Byward Market' },
    { value: 'centretown', label: 'Centretown' },
    { value: 'hintonburg', label: 'Hintonburg' },
  ]}
  selected={selected}
  onChange={setSelected}
/>
```

Multiple choices in titled sections:

```tsx
'use client';
const [channels, setChannels] = React.useState(['online-store', 'shop']);

<OptionList
  allowMultiple
  sections={[
    {
      title: 'Sales channels',
      options: [
        { value: 'online-store', label: 'Online Store' },
        { value: 'pos', label: 'Point of Sale' },
      ],
    },
    {
      title: 'Marketplaces',
      options: [
        { value: 'shop', label: 'Shop' },
        { value: 'google', label: 'Google & YouTube', disabled: true },
      ],
    },
  ]}
  selected={channels}
  onChange={setChannels}
/>
```

Uncontrolled, with a starting selection. `onChange` still reports every change:

```tsx
'use client';
const [sort, setSort] = React.useState('newest'); // sorts your list

<OptionList
  title="Sort by"
  options={[
    { value: 'newest', label: 'Newest' },
    { value: 'total', label: 'Order total' },
  ]}
  defaultSelected={['newest']}
  onChange={([value]) => setSort(value)}
/>
```

See Popover for an OptionList that closes its popover after a choice.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | — | Heading over `options`. Ignored when `sections` is set. |
| `options` | `OptionDescriptor[]` | — | `{ value: string; label: ReactNode; disabled?: boolean }`. |
| `sections` | `Array<{ title?: string; options: OptionDescriptor[] }>` | — | Grouped options. Takes precedence over `options`. |
| `selected` | `string[]` | — | Controlled selection. Without it, OptionList tracks its own. |
| `defaultSelected` | `string[]` | — | Initial selection when uncontrolled. |
| `onChange` | `(selected: string[]) => void` | — | Receives the full new selection. Client Components only. |
| `allowMultiple` | `boolean` | — | Checkboxes instead of a tick. |
| `className` | `string` | — | |

## Server Components
OptionList is a client component. Rendered from a Server Component it becomes a self-contained list that nothing can read, so use it from a Client Component with `onChange`.

## Accessibility
- The list has `role="listbox"`, plus `aria-multiselectable` when `allowMultiple` is set.
- Single-mode options are `role="option"` buttons with `aria-selected`. Multiple mode renders labelled checkboxes.
