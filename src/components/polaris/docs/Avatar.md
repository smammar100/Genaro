# Avatar

Represents a customer, staff member or store with an image, initials or the grey placeholder silhouette.

```tsx
import { Avatar } from '@/components/polaris';
```

## Use it for
- Customers and staff in lists, timelines and the top bar; stores in account menus.
- Pass `name`: it picks the initials (first letter of the first two words) and one of five palette pairs (`avatar-<n>-bg-fill` / `avatar-<n>-text-on-bg-fill`) deterministically, so a person keeps the same color everywhere.
- With no `name`, `initials` or `source`, the grey customer silhouette shows (`avatar-bg-fill`).
- `label` renders the file's "Avatar + label" pairing: the avatar plus text in `body-sm` medium, 8px apart.
- Sizes: `xs` 20 · `sm` 24 · `md` 28 (default) · `lg` 32 · `xl` 40.

## Examples

Initials, image and placeholder:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-200)' }}>
  <Avatar name="Jaydon Stanton" size="xl" />
  <Avatar name="Ruben Westerfelt" size="lg" />
  <Avatar source="/avatars/leo-carder.jpg" name="Leo Carder" />
  <Avatar size="sm" />
</div>
```

Avatar with a label (the text is announced; the avatar is hidden from screen readers):

```tsx
<Avatar name="Mae Jemison" label="Mae Jemison" size="sm" />
```

A store with explicit initials and its own accessible name:

```tsx
<Avatar name="Jaded Pixel" initials="JP" accessibilityLabel="Jaded Pixel store" size="lg" />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `name` | `string` | — | Drives the initials, the color and the default accessible name. |
| `initials` | `string` | from `name` | Overrides the computed initials. |
| `source` | `string` | — | Image URL (plain `<img>`, `object-fit: cover`); shown instead of initials. |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | 20 / 24 / 28 / 32 / 40px. |
| `label` | `ReactNode` | — | Text beside the avatar; wraps both in a row. |
| `accessibilityLabel` | `string` | `name` or `'Avatar'` | Accessible name when there's no `label`. |
| `className` | `string` | — | On the avatar, or on the row wrapper when `label` is set. |

## Server Components
Not a client component: render it anywhere.

## Accessibility
- Without `label`: `role="img"` with `accessibilityLabel`, falling back to `name`, then "Avatar".
- With `label`: the avatar is `aria-hidden` and the label text carries the name.
