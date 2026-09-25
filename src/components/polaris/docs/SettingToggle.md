# SettingToggle

A card that shows whether a setting is on or off — title, an On/Off badge and one toggle button.

```tsx
import { SettingToggle } from '@/components/polaris';
```

## Use it for
- Settings that take effect immediately when switched (test mode, automatic fulfillment). Settings saved with a form are `Checkbox`es.
- The badge names the state ("On" in `success`, "Off" in neutral); the button names the change — "Turn on" (primary) or "Turn off" (secondary). Both labels are fixed.
- The body (`children`) says what the setting does in one or two sentences.
- It draws its own card surface — place it directly in the layout, not inside another `Card`.

## Examples

Local state (Client Component):

```tsx
'use client';
const [enabled, setEnabled] = React.useState(false);

<SettingToggle title="Test mode" enabled={enabled} onToggle={() => setEnabled((on) => !on)}>
  Simulate successful and failed transactions without charging customers.
</SettingToggle>
```

Persisted with a Server Action and an optimistic update. `initialEnabled` comes from the page; `setAutoFulfill` saves the setting and calls `revalidatePath()`, so the prop catches up when the transition ends:

```tsx
'use client';
const [enabled, setOptimisticEnabled] = React.useOptimistic(initialEnabled);

<SettingToggle
  title="Automatic fulfillment"
  enabled={enabled}
  onToggle={() =>
    React.startTransition(async () => {
      setOptimisticEnabled(!enabled);
      await setAutoFulfill(!enabled);
    })
  }
>
  Orders are marked as fulfilled when payment is captured.
</SettingToggle>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `ReactNode` | — | Required. The setting's name, followed by the On/Off badge. |
| `enabled` | `boolean` | `false` | Current state; drives the badge and the button. |
| `onToggle` | `() => void` | — | Called by the button — flip `enabled` here. |
| `children` | `ReactNode` | — | What the setting does. |
| `className` | `string` | — | Extra classes on the card (layout only). |

## Server Components
Not a client component, but its button is a plain `type="button"` with no `url` or `submit` — it only works through `onToggle`, so render it from a Client Component.

## Accessibility
- The state is spoken through the badge text and the button label; the button doesn't use `aria-pressed`, so keep the title specific ("Automatic fulfillment", not "Enable").
