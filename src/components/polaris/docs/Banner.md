# Banner

A prominent, persistent message about the page or a task, in `info`, `success`, `warning` or `critical` tone (the file's Banner and Banner-with-no-title sets).

```tsx
import { Banner } from '@/components/polaris';
```

## Use it for
- Important information that stays until it's resolved or dismissed. Brief confirmations ("Product saved") are `Toast`s.
- Place it at the top of the page, or inside the card it concerns. One banner per concern.
- A `title` gives the toned header strip (`bg-fill-<tone>` with `text-<tone>-on-bg-fill`); without one you get the compact layout with a toned icon tile — good for one-line messages inside cards.
- `action` for the fix ("Edit shipping address"), `secondaryAction` for "Learn more"-style links. Button labels are verb + noun.
- Body text says what happened and how to fix it; no exclamation marks.

## Examples

Warning with a fix — `url` actions work from a Server Component:

```tsx
<Banner
  title="Before you can purchase a shipping label, this change needs to be made:"
  tone="warning"
  action={{ content: 'Edit shipping address', url: '/orders/1020/shipping-address' }}
>
  The name of the city you’re shipping to has characters that aren’t allowed.
</Banner>
```

Dismissible (Client Component — the Banner doesn't hide itself; remove it in `onDismiss`):

```tsx
'use client';
const [visible, setVisible] = React.useState(true);
if (!visible) return null;

<Banner
  title="Your store is ready to launch"
  action={{ content: 'Review checklist', url: '/settings/launch' }}
  secondaryAction={{ content: 'Learn more', url: '/help/launching-your-store' }}
  onDismiss={() => setVisible(false)}
>
  Add a domain and remove your password to open to customers.
</Banner>
```

Untitled — the compact layout for one-line messages, e.g. inside a card:

```tsx
<Banner tone="critical">High risk of fraud detected. Review the order before you fulfill it.</Banner>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | — | Adds the toned header strip; omit for the compact untitled layout. |
| `children` | `ReactNode` | — | Body text. |
| `tone` | `'info' \| 'success' \| 'warning' \| 'critical'` | `'info'` | |
| `icon` | `IconSource` | tone icon | Overrides `InfoMinor` / `TickMinor` / `RiskMajor` / `AlertMinor`. |
| `action` | `Action` | — | Secondary button: `{ content, url, external, onAction }`. |
| `secondaryAction` | `Action` | — | Tertiary button, same shape. |
| `onDismiss` | `() => void` | — | Shows a × button ("Dismiss notification"). |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Not a client component: render it from a Server Component with `url` actions. `onDismiss` and `onAction` need a Client Component.

## Accessibility
- `warning` and `critical` banners are `role="alert"` (announced immediately); `info` and `success` are `role="status"`. Reserve the alert tones for real problems.
- Titled banners render the title as an `h2`.
