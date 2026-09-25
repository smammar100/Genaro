# Labelled

The label, help text and error wrapper that TextField and Select use. Wrap your own controls in it so they match the kit's fields.

```tsx
import { Labelled } from '@/components/polaris';
```

## Use it for
- Custom controls that the kit's fields don't cover, such as a native date/time input, a color input or a third-party editor, when they need the standard label, help text and inline error.
- `id` is required. The `<label htmlFor={id}>` points at your control, so give the control the same `id`. Labelled renders the error with the id `${id}-error` and the help text with `${id}-help`. It doesn't touch your control, so set `aria-describedby` and `aria-invalid` on the control yourself.
- `error` as a string or node shows an InlineError (`AlertMinor`, `text-critical`) above the help text. `error={true}` renders nothing; it's only a signal for your control, for example to add `aria-invalid` or the `p-field--error` class.
- `labelHidden` keeps the label for screen readers only. `requiredIndicator` adds a red " \*". `labelAction` adds a plain button on the right of the label row, e.g. "Clear".
- For the TextField look, wrap a native input in `<div className="p-field">` and give the input `className="p-field__input"`. Add `p-field--error` while it's invalid. These classes come from `components.css`.
- The label, control, error and help text stack 4px apart (`space-100`). Help text uses `text-secondary`.

## Examples

A native date-time input with the TextField look. It renders from a Server Component and posts with a `<form>`:

```tsx
<Labelled id="publish-at" label="Publish date" helpText="Leave empty to publish right away.">
  <div className="p-field">
    <input id="publish-at" name="publishAt" type="datetime-local" className="p-field__input" aria-describedby="publish-at-help" />
  </div>
</Labelled>
```

Validation, a required indicator and a label action (Client Component):

```tsx
'use client';
const id = React.useId();
const [date, setDate] = React.useState('');
const error = date !== '' && new Date(date) < new Date() ? 'Choose a date in the future' : undefined;

<Labelled
  id={id}
  label="Publish date"
  requiredIndicator
  labelAction={{ content: 'Clear', onAction: () => setDate('') }}
  error={error}
  helpText="The product appears on your online store at this time."
>
  <div className={error ? 'p-field p-field--error' : 'p-field'}>
    <input
      id={id}
      type="datetime-local"
      className="p-field__input"
      value={date}
      onChange={(event) => setDate(event.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : `${id}-help`}
    />
  </div>
</Labelled>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `id` | `string` | — | Required. Your control's `id`. Also the prefix for `${id}-error` and `${id}-help`. |
| `label` | `ReactNode` | — | Without a label, no label row renders. |
| `labelHidden` | `boolean` | — | Visually hides the label but keeps it for screen readers. |
| `labelAction` | `Action` | — | Plain button in the label row. Uses `content`, `url` and `onAction`. |
| `error` | `ReactNode \| boolean` | — | A string or node shows an InlineError. `true` renders nothing. |
| `helpText` | `ReactNode` | — | `text-secondary` text below the control. |
| `requiredIndicator` | `boolean` | — | Adds a red " \*" after the label. |
| `children` | `ReactNode` | — | Your control. |

## Server Components
Labelled is not a client component and renders anywhere. `labelAction.onAction` and a controlled input need a Client Component.

## Accessibility
- The label only works when your control's `id` matches `id`.
- Point `aria-describedby` at `${id}-error` while there's an error message and at `${id}-help` otherwise, as TextField does. Set `aria-invalid` whenever the value is invalid.
