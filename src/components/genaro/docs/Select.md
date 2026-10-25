# Select

A Genaro field with `SelectMinor` chevrons that opens a Genaro option list — never the browser's own menu.

```tsx
import { Select, type SelectOption } from '@/components/genaro';
```

## Use it for
- Choosing one option from 4 or more. With fewer than 4, show them all with `ChoiceList` / `RadioButton`.
- `labelInline` puts the label inside the control ("Sort by Newest", "Date range Today") for sort and filter bars.
- Options are strings (label = value) or `{ label, value, disabled }` objects; labels in sentence case.
- `magic` only while Sidekick is choosing the value; remove it once the value settles.

## Examples

Uncontrolled with a saved value — posts `country` with a `<form>` and works from a Server Component:

```tsx
<Select
  label="Country/region"
  name="country"
  options={[
    { label: 'Australia', value: 'AU' },
    { label: 'Canada', value: 'CA' },
    { label: 'United Kingdom', value: 'GB' },
    { label: 'United States', value: 'US' },
  ]}
  defaultValue="CA"
  helpText="Used to calculate shipping rates and taxes."
/>
```

Inline-labelled sort control (Client Component):

```tsx
'use client';
const [sort, setSort] = React.useState('newest');

<Select
  label="Sort by"
  labelInline
  options={[
    { label: 'Newest', value: 'newest' },
    { label: 'Oldest', value: 'oldest' },
    { label: 'Total: high to low', value: 'total-desc' },
    { label: 'Total: low to high', value: 'total-asc' },
  ]}
  value={sort}
  onChange={setSort}
/>
```

Placeholder until a choice is made — the value must start as `''` (`savedProvince` comes from the page). The disabled placeholder posts nothing:

```tsx
<Select
  label="Province"
  name="province"
  placeholder="Select a province"
  options={['Alberta', 'British Columbia', 'Manitoba', 'Ontario', 'Quebec']}
  defaultValue={savedProvince ?? ''}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | Required. |
| `options` | `Array<string \| SelectOption>` | — | Required. `SelectOption` is `{ label, value, disabled?, media? }`; `media` (an xs `Avatar`, say) shows before the label in the list and in the field once chosen. |
| `value` | `string` | — | Controlled value; pair with `onChange` — without it the select is locked to `value`. |
| `defaultValue` | `string` | first option | Initial value when uncontrolled. |
| `onChange` | `(value: string, id: string) => void` | — | |
| `name` | `string` | — | Posts the value with a `<form>` / Server Action. |
| `labelInline` | `boolean` | — | Label inside the control (becomes the `aria-label`). |
| `labelHidden` | `boolean` | — | Visually hides the label. |
| `placeholder` | `string` | — | Disabled first option with value `''`; shown while the value is `''`. |
| `helpText` | `ReactNode` | — | |
| `error` | `ReactNode \| boolean` | — | A message renders an `InlineError`; `true` only marks it invalid. |
| `disabled` | `boolean` | — | |
| `magic` | `boolean` | — | Sidekick state. |
| `id` | `string` | generated | |
| `autoFocus` | `boolean` | — | |
| `defaultOpen` | `boolean` | — | Opens the list on mount — for an in-place editor (a spreadsheet cell). |
| `onBlur` | `() => void` | — | The field lost focus (picking an option keeps it). |
| `onKeyDown` | `(event) => void` | — | Runs before the field's own keys; `preventDefault()` skips them. |

## Server Components
Client component (`'use client'`), but it works uncontrolled from a Server Component: pass `name` and `defaultValue` (or `''` with a `placeholder`) inside `<form action={serverAction}>`. `value` + `onChange` need a Client Component.

## Accessibility
- A "select-only combobox": focus stays on the field while the list is open, and `aria-activedescendant` names the highlighted option.
- Keys: ↓/↑/Enter/Space open it; ↓/↑, Home/End and Page Up/Down move; typed letters jump (repeat a letter to cycle); Enter or Space picks; Escape closes only the list, not a modal or sheet around it; Tab closes it.
- The list opens above the field when there's more room there. `name` posts the value through a hidden input.
- `aria-describedby` points at the error message when `error` is a message, otherwise at the help text.
