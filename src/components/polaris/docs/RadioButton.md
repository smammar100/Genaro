# RadioButton

One option in a mutually exclusive set; radios with the same `name` form a group.

```tsx
import { RadioButton } from '@/components/polaris';
```

## Use it for
- Custom radio layouts. For a normal titled list of options use `ChoiceList` — it renders the group, `fieldset` and `legend` for you.
- Always render at least two radios in the same `name` group, with one selected by default.
- Labels are short, parallel and in sentence case; add `helpText` for consequences ("Customers collect orders in store.").
- `magic` only while Sidekick is picking the option.

## Examples

Uncontrolled group that posts `delivery` with a form — works from a Server Component:

```tsx
<>
  <RadioButton name="delivery" value="ship" label="Ship to customer" defaultChecked />
  <RadioButton name="delivery" value="pickup" label="Local pickup" helpText="Customers collect orders in store." />
  <RadioButton name="delivery" value="local" label="Local delivery" disabled />
</>
```

Controlled (Client Component) — `onChange` fires only on the radio that becomes checked:

```tsx
'use client';
const [method, setMethod] = React.useState('ship');

<>
  <RadioButton name="delivery" value="ship" label="Ship to customer" checked={method === 'ship'} onChange={() => setMethod('ship')} />
  <RadioButton name="delivery" value="pickup" label="Local pickup" checked={method === 'pickup'} onChange={() => setMethod('pickup')} />
</>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `ReactNode` | — | Required. Clicking it selects the radio. |
| `name` | `string` | — | Shared by the group; posts the checked radio's `value`. |
| `value` | `string` | — | Posted value (browser default `"on"`). |
| `checked` | `boolean` | — | Controlled state. Don't combine with `defaultChecked`. |
| `defaultChecked` | `boolean` | — | Initial state when uncontrolled. |
| `onChange` | `(checked: boolean, id: string) => void` | — | Called with `true` when this radio is selected. |
| `helpText` | `ReactNode` | — | Below the label, indented to line up with it. |
| `disabled` | `boolean` | — | |
| `labelHidden` | `boolean` | — | Visually hides the label. |
| `magic` | `boolean` | — | Sidekick state. |
| `id` | `string` | generated | |

## Server Components
Client component (`'use client'`), but a group works uncontrolled from a Server Component with `name`, `value` and `defaultChecked`. `checked` + `onChange` need a Client Component.

## Accessibility
- Arrow keys move between radios with the same `name` (native behavior).
- Standalone radios have no group label: wrap them in a `fieldset` with a `legend`, or use `ChoiceList`.
