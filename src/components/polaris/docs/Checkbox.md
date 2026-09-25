# Checkbox

Toggles a single option on or off; supports the indeterminate state for "select all".

```tsx
import { Checkbox } from '@/components/polaris';
```

## Use it for
- Independent on/off options in forms and settings. For a titled group of related options use `ChoiceList allowMultiple`; for settings that take effect immediately use `SettingToggle`.
- Labels are positive statements: "Charge tax on this product", not "Don't charge tax".
- `checked="indeterminate"` for a parent box whose children are partly selected.
- Checked boxes fill with `bg-fill-brand-selected`; boxes with an `error` use `bg-surface-critical`. `magic` only while Sidekick is setting the value.

## Examples

Uncontrolled in a Server Action form — works from a Server Component:

```tsx
<Card>
  <Checkbox label="Charge tax on this product" name="taxable" defaultChecked />
  <Checkbox label="Track quantity" name="trackQuantity" helpText="Inventory updates when orders are placed." />
</Card>
```

A checked box posts its `value` (`"on"` when unset); an unchecked box posts nothing — read it with `formData.get('taxable') === 'on'`.

"Select all" with the indeterminate state (Client Component):

```tsx
'use client';
const orderIds = ['1020', '1019', '1018'];
const [selected, setSelected] = React.useState<string[]>(['1020']);

<Checkbox
  label="Select all orders"
  checked={selected.length === orderIds.length ? true : selected.length > 0 ? 'indeterminate' : false}
  onChange={(checked) => setSelected(checked ? orderIds : [])}
/>
```

With an error:

```tsx
<Checkbox label="I agree to the terms of service" name="terms" error="Accept the terms of service to activate payments" />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `ReactNode` | — | Required. Clicking it toggles the box. |
| `checked` | `boolean \| 'indeterminate'` | — | Controlled state; pair with `onChange`. |
| `defaultChecked` | `boolean` | `false` | Initial state when uncontrolled. |
| `onChange` | `(checked: boolean, id: string) => void` | — | Clicking an indeterminate box reports `true`. |
| `name` | `string` | — | Posts with a `<form>` / Server Action. |
| `value` | `string` | — | Posted value when checked (browser default `"on"`). |
| `helpText` | `ReactNode` | — | Below the label, indented to line up with it. |
| `error` | `ReactNode \| boolean` | — | A message renders an `InlineError`; `true` only styles the box. |
| `disabled` | `boolean` | — | |
| `labelHidden` | `boolean` | — | Visually hides the label (e.g. row checkboxes in tables). |
| `magic` | `boolean` | — | Sidekick state. |
| `id` | `string` | generated | |

## Server Components
Client component (`'use client'`), but it works uncontrolled from a Server Component with `name` and `defaultChecked`. `checked` + `onChange` need a Client Component.

## Accessibility
- The `label` wraps the input, so the whole label is a click target; the indeterminate state is exposed as `aria-checked="mixed"`.
- `aria-describedby` points at the error message when `error` is a message, otherwise at the help text.
