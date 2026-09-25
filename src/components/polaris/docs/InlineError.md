# InlineError

A one-line validation message with the `AlertMinor` icon, in `text-critical` / `icon-critical`.

```tsx
import { InlineError } from '@/components/polaris';
```

## Use it for
- Field errors — but `TextField`, `Select`, `Checkbox`, `ChoiceList` and `DropZone` already render it from their `error` prop. Use it directly only under custom controls or groups that have no `error` prop.
- Say what's wrong and how to fix it: "Enter a valid email address", "Choose a delivery date after Sep 25, 2026". No blame, no exclamation marks.
- Show it after the merchant has had a chance to act (on blur or submit), not on first render.

## Examples

Most of the time, pass the message to the field — here from a Server Action through `useActionState` (`createDiscount(prev, formData)` returns `{ code?: string }`):

```tsx
'use client';
const [errors, formAction] = React.useActionState(createDiscount, {});

<form action={formAction}>
  <TextField label="Discount code" name="code" error={errors.code} />
  <Button variant="primary" submit>
    Save discount
  </Button>
</form>
```

Directly, under a control without an `error` prop — give it an `id` and reference it with `aria-describedby`:

```tsx
<div role="group" aria-label="Delivery date" aria-describedby="delivery-date-error">
  <DatePicker selected={new Date(2026, 8, 24)} />
  <InlineError id="delivery-date-error" message="Choose a delivery date after Sep 25, 2026" />
</div>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `message` | `ReactNode` | — | Required. What's wrong and how to fix it. |
| `id` | `string` | — | For `aria-describedby` on the control or group. |

## Server Components
Not a client component: render it anywhere, e.g. from a Server Component that re-renders a form with validation results.

## Accessibility
- It's plain text: no `role="alert"`, so it isn't announced when it appears. Link it to its control with `id` + `aria-describedby` — `TextField`, `Select` and `Checkbox` already do this for their own `error`.
- The icon is decorative; the message must stand alone.
