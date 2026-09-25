# ColorPicker

Picks a color with a 160px saturation/brightness square, a hue slider and an optional alpha slider. Values are HSB(A), not hex.

```tsx
import { ColorPicker, hsbToHex, type HSBAColor } from '@/components/polaris';
```

## Use it for
- Brand and theme colors (checkout accent, button color, label colors).
- Pair it with a `TextField` that shows the hex value, usually inside a `Popover` opened from a swatch button (the file's "Color picker in Popover" template).
- `allowAlpha` only when transparency is meaningful; `fullWidth` when it's the main content of a panel.
- Convert for display and storage with `hsbToHex(hue, saturation, brightness)` → `'#rrggbb'` (alpha is not included).

## Examples

Picker with a read-only hex field that posts with the form (Client Component):

```tsx
'use client';
const [color, setColor] = React.useState<HSBAColor>({ hue: 210, saturation: 0.9, brightness: 0.8 });
const hex = hsbToHex(color.hue, color.saturation, color.brightness);

<>
  <ColorPicker color={color} onChange={setColor} />
  <TextField label="Accent color" name="accentColor" value={hex} readOnly />
</>
```

In a `Popover`, opened from a button that shows the current swatch (same `color` / `hex` state, plus `open`):

```tsx
'use client';
const [open, setOpen] = React.useState(false);

<Popover
  active={open}
  onClose={() => setOpen(false)}
  sectioned
  activator={
    <Button
      disclosure
      icon={<span style={{ width: 'var(--space-400)', height: 'var(--space-400)', margin: 'auto', borderRadius: 'var(--radius-100)', background: hex }} />}
      onClick={() => setOpen((o) => !o)}
    >
      Accent color
    </Button>
  }
>
  <ColorPicker color={color} onChange={setColor} />
</Popover>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `color` | `HSBAColor` | `{ hue: 210, saturation: 0.8, brightness: 0.8, alpha: 1 }` | `{ hue: 0–359, saturation: 0–1, brightness: 0–1, alpha?: 0–1 }`. Controlled only together with `onChange`; otherwise the initial color. |
| `onChange` | `(color: HSBAColor) => void` | — | Fires continuously while dragging. |
| `allowAlpha` | `boolean` | — | Adds the alpha slider (checkerboard behind the current color). |
| `fullWidth` | `boolean` | — | The square grows to fill the row. |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Client component (`'use client'`). It has no `name` and nothing to read without `onChange`, so render it from a Client Component and post the value through a field (like the hex `TextField` above).

## Accessibility
- The picker is pointer-only: no keyboard support and no ARIA roles. Always offer a text field for the value next to it.
