# KeyboardKey

Displays a keyboard key or shortcut as a `<kbd>` keycap.

```tsx
import { KeyboardKey } from '@/components/polaris';
```

## Use it for
- Shortcut hints in help text, menus and search fields.
- Write keys as the platform shows them: `⌘` on macOS, `Ctrl` on Windows; one key per cap, or a short combo like `⌘K`.
- `size="small"` (16px tall) inside fields and dense rows; the default is 20px.
- `dark` on dark chrome such as the top bar — the key switches to `bg-fill-inverse`. `TopBar` already shows `⌘K`, and `Tooltip` renders its `suffix` as a KeyboardKey — no need to add one there.

## Examples

Inline in help text:

```tsx
<p>
  Press <KeyboardKey>⌘</KeyboardKey> <KeyboardKey>K</KeyboardKey> to search your store.
</p>
```

As a field hint:

```tsx
<TextField
  label="Search"
  labelHidden
  prefix="SearchMinor"
  placeholder="Search orders"
  suffix={<KeyboardKey size="small">⌘K</KeyboardKey>}
/>
```

On dark chrome:

```tsx
<div style={{ background: 'var(--bg-inverse)', color: 'var(--text-inverse)', padding: 'var(--space-200)' }}>
  Search <KeyboardKey dark>⌘K</KeyboardKey>
</div>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | The key label. |
| `size` | `'small'` | — | 16px tall with 11px text instead of 20px. |
| `dark` | `boolean` | — | For dark chrome: `bg-fill-inverse` with `text-inverse-secondary`. |
| `className` | `string` | — | Extra classes on the `kbd`. |

## Server Components
Not a client component: render it anywhere.

## Accessibility
- It only displays the shortcut — wiring the key handler is up to you. Name the action in text too ("to search your store"); screen readers announce symbols like `⌘` inconsistently.
