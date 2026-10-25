# Switch

An on/off toggle for a setting that applies the moment it flips, such as publishing a vehicle to a channel.

```tsx
import { Switch } from '@/components/genaro';
```

## Use it for
- Settings that take effect at once, with no save button: publish to AutoTrader, background processing. For an option saved with a form's submit button use `Checkbox`; for one important setting with an explanation, `SettingToggle`.
- The label says what's on when the switch is on, as a positive statement: "Publish to AutoTrader", not "Disable publishing". Don't add "On" or "Off" text beside it; the switch shows the state.
- `labelPosition="start"` for a settings row: the label and help text on the left, the switch at the far right of the row.
- `labelHidden` when the row already names the switch, such as a table cell. Make the hidden label specific: "Publish OY70 TZG to AutoTrader".
- When flipping it saves to the server, update optimistically and flip it back with an error Toast if the save fails.
- The off track is outlined like a Checkbox; on, it fills with `bg-fill-brand-selected`. `error` uses the critical surface, as Checkbox does.

## Examples

Local state (Client Component):

```tsx
'use client';
const [autoTrader, setAutoTrader] = React.useState(true);

<Switch label="Publish to AutoTrader" checked={autoTrader} onChange={setAutoTrader} />
```

A settings row saved through a Server Action, with an optimistic update. `initialOn` comes from the page; `setBackgroundProcessing` saves the setting and revalidates the page:

```tsx
'use client';
const [on, setOptimisticOn] = React.useOptimistic(initialOn);

<Switch
  label="Background processing"
  helpText="Removes the background from new photos and adds the forecourt backdrop."
  labelPosition="start"
  checked={on}
  onChange={(next) =>
    React.startTransition(async () => {
      setOptimisticOn(next);
      await setBackgroundProcessing(next);
    })
  }
/>
```

In a table cell, named by its hidden label:

```tsx
<Switch label={`Publish ${vehicle.registration} to AutoTrader`} labelHidden checked={published} onChange={togglePublished} />
```

In a react-hook-form form, use `FormSwitch` (see Form fields).

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `ReactNode` | — | Required, even when hidden. Clicking it flips the switch. |
| `checked` | `boolean` | — | Controlled state; pair with `onChange`. |
| `defaultChecked` | `boolean` | `false` | Initial state when uncontrolled. |
| `onChange` | `(checked: boolean, id: string) => void` | — | Called as soon as it flips. |
| `helpText` | `ReactNode` | — | Under the label in `text-secondary`. |
| `error` | `ReactNode \| boolean` | — | A message renders an `InlineError`; `true` only styles the track. |
| `disabled` | `boolean` | — | Say why in `helpText`. |
| `labelHidden` | `boolean` | — | Visually hides the label; screen readers still read it. |
| `labelPosition` | `'end' \| 'start'` | `'end'` | `'start'`: label first, switch at the row's far end. |
| `name` | `string` | — | Posts `value` with a `<form>` while on; nothing while off. |
| `value` | `string` | `"on"` | Posted value while on. |
| `id` | `string` | generated | |

## Server Components
Client component (`'use client'`). It works uncontrolled from a Server Component with `name` and `defaultChecked`, but a switch should apply at once, so it's usually controlled from a Client Component with `checked` + `onChange`.

## Accessibility
- A native checkbox with `role="switch"`: Space flips it, and screen readers announce "switch, on" or "off".
- The label is linked with `htmlFor`; `aria-describedby` points at the error message when `error` is a message, otherwise at the help text.
- Keyboard focus draws the `border-focus` ring around the track. On touch screens the hit area grows to 56 × 44px without moving anything.
- The thumb's slide stops under `prefers-reduced-motion`.
