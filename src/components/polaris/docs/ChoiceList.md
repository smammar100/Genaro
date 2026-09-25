# ChoiceList

A titled group of radio buttons (one choice) or checkboxes (`allowMultiple`), rendered as a `fieldset` with a `legend`.

```tsx
import { ChoiceList, type Choice } from '@/components/polaris';
```

## Use it for
- 2–5 options that merchants should see at once. More options → `Select` (single) or `OptionList`.
- Single choice (radios) by default; `allowMultiple` switches to checkboxes.
- Choice labels are short and parallel; put consequences in a choice's `helpText`.
- For single choice, start with one option selected (`defaultSelected` or `selected`).

## Examples

Uncontrolled single choice with a starting selection — posts `companyName` with a form and works from a Server Component:

```tsx
<ChoiceList
  title="Company name"
  name="companyName"
  choices={[
    { label: 'Don’t include', value: 'hidden' },
    { label: 'Optional', value: 'optional' },
    { label: 'Required', value: 'required' },
  ]}
  defaultSelected={['optional']}
/>
```

Controlled multiple choice with validation (Client Component). Every checked value posts under `name` — read them with `formData.getAll('channels')`:

```tsx
'use client';
const [channels, setChannels] = React.useState(['online-store']);

<ChoiceList
  title="Sales channels"
  name="channels"
  allowMultiple
  choices={[
    { label: 'Online Store', value: 'online-store' },
    { label: 'Point of Sale', value: 'pos', helpText: 'In-person sales at your retail locations.' },
    { label: 'Shop', value: 'shop' },
  ]}
  selected={channels}
  onChange={setChannels}
  error={channels.length ? undefined : 'Select at least one sales channel'}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `ReactNode` | — | Required. The `legend`. |
| `choices` | `Choice[]` | — | Required. `{ label, value, helpText?, disabled? }`. |
| `selected` | `string[]` | — | Controlled selection; pair with `onChange` — without it the selection is locked. |
| `defaultSelected` | `string[]` | `[]` | Initial selection when uncontrolled. |
| `onChange` | `(selected: string[], name?: string) => void` | — | Receives the full new selection. |
| `allowMultiple` | `boolean` | — | Checkboxes instead of radios. |
| `name` | `string` | generated | Input name for form posts — pass it whenever the list is inside a form. |
| `titleHidden` | `boolean` | — | Visually hides the title (e.g. inside a filter popover). |
| `error` | `ReactNode` | — | Shown as an `InlineError` under the list. |
| `disabled` | `boolean` | — | Disables every choice. |
| `className` | `string` | — | Extra classes on the `fieldset`. |

## Server Components
Client component (`'use client'`), but it works uncontrolled from a Server Component: pass `name` and `defaultSelected`, as above. `selected` + `onChange` need a Client Component.

## Accessibility
- `fieldset` + `legend` group the choices; `titleHidden` keeps the legend for screen readers.
- The `error` isn't linked to the inputs with `aria-describedby`, so make its text self-explanatory.
