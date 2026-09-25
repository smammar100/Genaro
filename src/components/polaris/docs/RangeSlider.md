# RangeSlider

Selects a number, or a low–high range with two thumbs, along a track (3px `input-border` track, `bg-fill-brand` fill and thumbs).

```tsx
import { RangeSlider, type RangeSliderValue } from '@/components/polaris';
```

## Use it for
- Approximate values where dragging is natural: opacity, discount percentage, price or spend ranges.
- Show the current value — in `prefix`/`suffix`, or with a paired `TextField` when precision matters.
- Pass `value` as `[low, high]` for a dual-thumb range; the track between the thumbs fills with `bg-fill-brand`.

## Examples

Single value with the current value as suffix (Client Component). There's no `name` prop, so a hidden input posts the value with the form:

```tsx
'use client';
const [discount, setDiscount] = React.useState<RangeSliderValue>(15);

<>
  <RangeSlider label="Discount" min={5} max={50} step={5} value={discount} onChange={setDiscount} suffix={`${discount}%`} />
  <input type="hidden" name="discountPercent" value={String(discount)} />
</>
```

Dual thumb — `onChange` receives `RangeSliderValue`, so narrow it before storing a tuple:

```tsx
'use client';
const [spent, setSpent] = React.useState<[number, number]>([300, 1200]);

<RangeSlider
  label="Money spent is between"
  min={0}
  max={2000}
  step={10}
  value={spent}
  onChange={(next) => {
    if (Array.isArray(next)) setSpent(next);
  }}
  prefix={`$${spent[0]}`}
  suffix={`$${spent[1]}`}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | Visible label; also the thumbs' `aria-label` ("… minimum" / "… maximum" for two thumbs). |
| `value` | `number \| [number, number]` | `50` | Controlled only together with `onChange`; otherwise it's the initial value. |
| `onChange` | `(value: RangeSliderValue) => void` | — | Fires while dragging. |
| `min` | `number` | `0` | |
| `max` | `number` | `100` | |
| `step` | `number` | `1` | |
| `prefix` | `ReactNode` | — | Before the track, in `text-secondary`. |
| `suffix` | `ReactNode` | — | After the track. |
| `helpText` | `ReactNode` | — | |
| `disabled` | `boolean` | — | |
| `className` | `string` | — | Extra classes on the root (layout only). |

The thumbs can't cross: the low thumb stops at the high one and vice versa.

## Server Components
Client component (`'use client'`). From a Server Component `value` only sets the starting point and nothing reads the result (no `name`), so render it from a Client Component with `value` + `onChange`.

## Accessibility
- Native `input type="range"` thumbs: arrow keys, Home and End work, with the 2px `border-focus` ring on the focused thumb.
- The visible label isn't a `<label for>`; the thumbs are named through `aria-label` instead, so always pass `label`.
