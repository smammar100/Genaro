# ButtonGroup

Lays out related buttons 8px apart (`space-button-group-gap`), or joins them into one segmented control.

```tsx
import { ButtonGroup } from '@/components/polaris';
```

## Use it for
- Rows of related actions: form footers, card headers, toolbars. Put the primary action **last** (right-most).
- `variant="segmented"` for mutually exclusive toggles such as Day / Week / Month; mark the active option with `pressed` on its `Button`.
- `gap="tight"` (4px) for rows of icon-only buttons; `fullWidth` to stretch the buttons across narrow containers.
- Children should be `Button`s — use a plain flex row for mixed content.

## Examples

Form footer — Cancel navigates with `url`, Save posts the surrounding `<form>`:

```tsx
<ButtonGroup>
  <Button url="/orders/1020">Cancel</Button>
  <Button variant="primary" submit>
    Save
  </Button>
</ButtonGroup>
```

Segmented control (Client Component — `pressed` follows state):

```tsx
'use client';
const [range, setRange] = React.useState<'day' | 'week' | 'month'>('week');

<ButtonGroup variant="segmented">
  <Button pressed={range === 'day'} onClick={() => setRange('day')}>
    Day
  </Button>
  <Button pressed={range === 'week'} onClick={() => setRange('week')}>
    Week
  </Button>
  <Button pressed={range === 'month'} onClick={() => setRange('month')}>
    Month
  </Button>
</ButtonGroup>
```

Icon toolbar with the tight gap — `false`/`null` children are skipped, so a conditional button leaves no empty slot:

```tsx
<ButtonGroup gap="tight">
  <Button icon="PrintMajor" accessibilityLabel="Print order" url="/orders/1020/print" />
  <Button icon="DuplicateMinor" accessibilityLabel="Duplicate order" url="/orders/1020/duplicate" />
  {canEdit && <Button icon="EditMinor" accessibilityLabel="Edit order" url="/orders/1020/edit" />}
</ButtonGroup>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | `Button`s; each is wrapped in a group item. Falsy children are skipped. |
| `variant` | `'segmented'` | — | Joins the buttons into one control with `role="group"`. |
| `fullWidth` | `boolean` | — | Buttons stretch to fill the row (no wrapping). |
| `gap` | `'tight'` | — | 4px instead of 8px between buttons. |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Not a client component: render it from a Server Component with `url` / `submit` buttons. Buttons that use `onClick` or state-driven `pressed` need a Client Component.

## Accessibility
- Segmented groups get `role="group"`; `pressed` exposes each option's state as `aria-pressed`.
- Every icon-only button needs its own `accessibilityLabel`.
