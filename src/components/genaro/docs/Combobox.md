# Combobox

A text field that searches a list as people type, then picks one option, or several with `allowMultiple`. The Genaro option list opens under the field and focus never leaves the field.

```tsx
import { Combobox, type ComboboxOption } from '@/components/genaro';
```

## Use it for
- Picking from a long list that people know by name or code: a vehicle by its reg, a member of staff, a warranty. For a short fixed list use `Select`; to show two to five choices at once, `ChoiceList`.
- Options are `{ value, label }`. Add `description` for a second line, `media` for an xs `Avatar` before the label, `suffix` for a `Badge` or short note at the end, `keywords` for text that typing matches but the row doesn't show (a stock ID), and `disabled`.
- Typing filters `options`. An option matches when every typed word is in its label or keywords, ignoring case, or when the text with its spaces and punctuation removed is. So "oy70tzg", "OY70 TZG" and "L-927" (in `keywords`) find the same car. The top match is highlighted, so people type and press Enter. Pass `filter` for a different rule.
- `value` is a string, `''` when nothing is picked; with `allowMultiple` it's a `string[]`. Look the record up by its id in `onChange`.
- `clearable` when "nothing picked" is a valid answer ("Unassigned", "All makes"). It adds a clear button, and erasing the text then leaving the field clears it too. Without `clearable`, leaving the field puts the picked option back.
- `allowMultiple` shows the picks as removable tags in the field. The list stays open between picks, and Backspace in the empty field removes the last tag.
- `emptyState` says what to do when nothing matches: "No vehicle matches that reg."
- Remote search: handle `onQueryChange`, set `loading` while the request runs, and pass `filter={null}` so the results show as the server returned them. Debounce in your handler. Include the picked option in `options` on first render so the field can show its label; after that, the Combobox remembers the labels of options picked from earlier results.

## Examples

A vehicle by its reg, as in the warranty and claim dialogs (Client Component):

```tsx
'use client';
const [vehicleId, setVehicleId] = React.useState('');

<Combobox
  label="Vehicle"
  prefix="SearchMinor"
  placeholder="Search by reg, stock ID or model"
  options={vehicles.map((v) => ({
    value: v.id,
    label: `${v.registration} · ${v.make} ${v.model}`,
    description: `${v.stockId} · ${v.status}`,
    keywords: [v.stockId],
  }))}
  value={vehicleId}
  onChange={setVehicleId}
  emptyState="No vehicle matches that reg."
/>
```

A filter where clearing means "all", and an assignee in a table row:

```tsx
<Combobox label="Make" options={makes} placeholder="All makes" clearable value={make} onChange={setMake} />

<Combobox
  label={`Assign ${vehicle.registration}`}
  labelHidden
  placeholder="Unassigned"
  clearable
  options={staff.map((u) => ({ value: u.id, label: u.name, media: <Avatar size="xs" name={u.name} /> }))}
  value={vehicle.preparerId ?? ''}
  onChange={(id) => assign(vehicle.id, id || null)}
/>
```

Several values:

```tsx
'use client';
const [features, setFeatures] = React.useState<string[]>([]);

<Combobox label="Features" allowMultiple placeholder="Search features" options={featureOptions} value={features} onChange={setFeatures} />
```

Remote search through a Server Action (`searchCustomers` returns at most 20 customers):

```tsx
'use client';
const [customerId, setCustomerId] = React.useState('');
const [results, setResults] = React.useState<ComboboxOption[]>([]);
const [loading, setLoading] = React.useState(false);
const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

function search(query: string) {
  clearTimeout(timer.current);
  if (!query.trim()) return setLoading(false);
  setLoading(true);
  timer.current = setTimeout(async () => {
    const customers = await searchCustomers(query);
    setResults(customers.map((c) => ({ value: c.id, label: c.name, description: c.mobile })));
    setLoading(false);
  }, 250);
}

<Combobox
  label="Customer"
  prefix="SearchMinor"
  placeholder="Search by name or mobile"
  options={results}
  filter={null}
  loading={loading}
  onQueryChange={search}
  value={customerId}
  onChange={setCustomerId}
/>
```

In a react-hook-form form, use `FormCombobox` (see Form fields).

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | Required, even when hidden. Also names the list. |
| `options` | `ComboboxOption[]` | — | Required. `{ value, label, description?, media?, suffix?, keywords?, disabled? }`. |
| `value` | `string` / `string[]` | — | Controlled value: a `string[]` with `allowMultiple`, else a string (`''` for none). |
| `defaultValue` | `string` / `string[]` | `''` / `[]` | Initial value when uncontrolled. |
| `onChange` | `(value, id: string) => void` | — | The picked value (`''` when cleared), or every picked value with `allowMultiple`. |
| `allowMultiple` | `boolean` | — | Pick several; they show as tags. |
| `placeholder` | `string` | — | Shown while the field is empty. |
| `prefix` | `ReactNode` | — | An icon name (`'SearchMinor'`) or any node. |
| `clearable` | `boolean` | — | Clear button while something is picked; erased text clears on leaving. |
| `emptyState` | `ReactNode` | `'No matches'` | Shown in the list when nothing matches. |
| `filter` | `((option, query) => boolean) \| null` | words or squashed text | `null` shows `options` unfiltered, for server results. |
| `onQueryChange` | `(query: string) => void` | — | The typed text; `''` when the search resets. |
| `loading` | `boolean` | — | A spinner in place of the options. |
| `helpText` | `ReactNode` | — | Under the field. |
| `error` | `ReactNode \| boolean` | — | A message renders an `InlineError`; `true` only marks the field invalid. |
| `disabled` | `boolean` | — | |
| `labelHidden` | `boolean` | — | Visually hides the label. |
| `requiredIndicator` | `boolean` | — | Adds " *" to the label; doesn't validate. |
| `name` | `string` | — | Posts the value with a `<form>` (one hidden input per value). |
| `id` | `string` | generated | The text input's id. |

## Server Components
Client component (`'use client'`). It works uncontrolled from a Server Component inside `<form action={serverAction}>` with `name` and `defaultValue`, as long as `options` are plain data (no `media` elements that need the client). `value` + `onChange`, `onQueryChange` and `filter` need a Client Component.

## Accessibility
- The ARIA 1.2 editable combobox: the input has `role="combobox"`, `aria-expanded` and, while the list is open, `aria-controls` and `aria-activedescendant` naming the highlighted option. The list is a `listbox` (`aria-multiselectable` with `allowMultiple`) of `option`s with `aria-selected`.
- Keys: typing opens and filters the list; ↓/↑ open it and move; Page Up/Down move by 10; Enter picks the highlighted option and never submits the form while the list is open; Escape closes only the list and puts the text back, not a modal or sheet around it; Tab leaves the field; Backspace in an empty multiple field removes the last tag.
- A polite live region announces the number of matches, or the empty state.
- The chevron button is out of the tab order. The clear button is in it, labelled "Clear"; tags' remove buttons are labelled "Remove <label>".
- Focusing a field that has a picked option selects its text, so typing replaces it.
- `aria-describedby` points at the error message when `error` is a message, otherwise at the help text.
