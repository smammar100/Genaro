# TextField

Single- or multi-line text input with label, help text and inline error (the file's Text field, Number field and Multiline text field sets).

```tsx
import { TextField } from '@/components/polaris';
```

## Use it for
- Every free-text input. Always pass a `label`; hide it with `labelHidden` only when context makes the purpose obvious (search).
- `type="number"` adds up/down stepper buttons; for prices use `inputMode="decimal"` with a `"$"` prefix instead of a stepper.
- `prefix` / `suffix` for units and currency ("$", "kg"); both also accept an icon name (`'SearchMinor'`).
- Errors say what happened and how to fix it: "Enter a valid email address". No blame, no exclamation marks.
- `magic` only while Sidekick is writing into the field (the `border-magic-secondary` halo); remove it once the value settles.

## Examples

Uncontrolled fields that post with a Server Action — works from a Server Component (`updateProduct` is a Server Action):

```tsx
<form action={updateProduct}>
  <Card>
    <TextField label="Title" name="title" defaultValue="Mid-century armchair" required requiredIndicator />
    <TextField label="Description" name="description" multiline={4} />
    <TextField label="Price" name="price" prefix="$" inputMode="decimal" defaultValue="969.44" />
    <TextField label="Weight" name="weight" type="number" step={0.5} defaultValue="12" suffix="kg" />
    <ButtonGroup>
      <Button variant="primary" submit>
        Save
      </Button>
    </ButtonGroup>
  </Card>
</form>
```

Controlled with validation (Client Component):

```tsx
'use client';
const [email, setEmail] = React.useState('');
const invalid = email !== '' && !email.includes('@');

<TextField
  label="Email"
  type="email"
  name="email"
  autoComplete="email"
  value={email}
  onChange={setEmail}
  error={invalid ? 'Enter a valid email address' : undefined}
  helpText="We’ll send order updates to this address."
/>
```

Search with a clear button — the × doesn't call `onChange`, so reset a controlled value in `onClearButtonClick`:

```tsx
'use client';
const [query, setQuery] = React.useState('');

<TextField
  label="Search orders"
  labelHidden
  prefix="SearchMinor"
  placeholder="Search by order number or customer"
  value={query}
  onChange={setQuery}
  clearButton
  onClearButtonClick={() => setQuery('')}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `ReactNode` | — | Required, even when hidden. |
| `value` | `string` | — | Controlled value; pair with `onChange`. |
| `defaultValue` | `string` | `''` | Initial value when uncontrolled. |
| `onChange` | `(value: string, id: string) => void` | — | |
| `name` | `string` | — | Posts the value with a `<form>` / Server Action. |
| `type` | `'text' \| 'email' \| 'number' \| 'password' \| 'search' \| 'tel' \| 'url'` | `'text'` | `number` adds the stepper. |
| `step` | `number` | `1` | Stepper increment for `type="number"`; results are rounded to the step's (or value's) decimals, so `0.1` steps stay clean. |
| `multiline` | `boolean \| number` | — | Textarea: `true` for 3 rows, or a row count. |
| `placeholder` | `string` | — | |
| `prefix` | `ReactNode` | — | Text, a node, or an icon name. |
| `suffix` | `ReactNode` | — | Text, a node, or an icon name. |
| `clearButton` | `boolean` | — | × shown while there's a value. |
| `onClearButtonClick` | `(id: string) => void` | — | Called by the ×; `onChange` isn't. |
| `helpText` | `ReactNode` | — | Shown below the field in `text-secondary`. |
| `error` | `ReactNode \| boolean` | — | A message renders an `InlineError`; `true` only marks the field invalid. |
| `disabled` | `boolean` | — | Also hides the stepper. |
| `readOnly` | `boolean` | — | Also hides the stepper. |
| `labelHidden` | `boolean` | — | Visually hides the label; screen readers still read it. |
| `labelAction` | `Action` | — | Plain button beside the label (`url` or `onAction`). |
| `requiredIndicator` | `boolean` | — | Adds " *" to the label; doesn't set `required`. |
| `required` | `boolean` | — | Native `required`. |
| `maxLength` | `number` | — | |
| `connectedLeft` / `connectedRight` | `ReactNode` | — | Controls on the same row, 8px apart (a unit `Select`, a `Button`). |
| `autoComplete` | `string` | `'off'` | Set real tokens (`email`, `postal-code`, `tel`) for customer data. |
| `inputMode` | `'decimal' \| 'numeric' \| 'email' \| …` | — | Mobile keyboard hint. |
| `magic` | `boolean` | — | Sidekick state. |
| `id` | `string` | generated | |

## Server Components
Client component (`'use client'`), but it works uncontrolled from a Server Component: pass `name` and `defaultValue` inside `<form action={serverAction}>`. `value` + `onChange`, `onClearButtonClick` and `labelAction.onAction` need a Client Component.

## Accessibility
- The label is always rendered (visually hidden with `labelHidden`) and linked with `htmlFor`.
- `aria-invalid` follows `error`; `aria-describedby` points at the error message when `error` is a message, otherwise at the help text — not both.
