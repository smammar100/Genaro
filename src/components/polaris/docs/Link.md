# Link

Inline text link (`text-link`, darkens on hover). Internal URLs go through the router link from `PolarisProvider`; with `onClick` and no `url` it renders a link-styled button.

```tsx
import { Link } from '@/components/polaris';
// In files that also use next/link: import { Link as PolarisLink } from '@/components/polaris';
```

## Use it for
- Navigation inside sentences, help text, banners and table cells.
- Link text describes the destination: "Learn more about fulfilling orders", never "click here".
- An inline action inside running text ("Add tracking"): pass `onClick` without `url` to get a link-styled `<button type="button">`. Standalone actions are `Button`s — `variant="plain"` when they must sit inline.
- `monochrome` inherits the surrounding text color (e.g. inside colored banner text); `removeUnderline` where context already signals a link, such as names in a list — the underline returns on hover.
- `external` for other sites: it opens a new tab with `rel="noopener noreferrer"`.

## Examples

Inline in help text — works from a Server Component:

```tsx
<p>
  Learn more about <Link url="/help/fulfilling-orders">fulfilling orders</Link>.
</p>
```

External tracking link:

```tsx
<p>
  Shipped with UPS:{' '}
  <Link url="https://www.ups.com/track?tracknum=1Z999AA10123456784" external>
    1Z999AA10123456784
  </Link>
</p>
```

Customer name in a list row — monochrome, underlined on hover only:

```tsx
<Link url="/customers/207119551" monochrome removeUnderline>
  Jaydon Stanton
</Link>
```

Inline action (Client Component — `openTrackingModal` is your handler):

```tsx
<p>
  No tracking number yet. <Link onClick={openTrackingModal}>Add tracking</Link>
</p>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | The link text. |
| `url` | `string` | — | Internal paths use the provider's `linkComponent`; absolute, `mailto:` and `#…` URLs render a plain `<a>`. Without `url`: a `<button>` if `onClick` is set, otherwise an anchor to `#`. |
| `external` | `boolean` | — | New tab, `rel="noopener noreferrer"` (with `url`). |
| `target` | `string` | — | Anchor target; `_blank` when `external`. |
| `monochrome` | `boolean` | — | Inherits the surrounding text color. |
| `removeUnderline` | `boolean` | — | No underline until hover. |
| `onClick` | `(event: MouseEvent<HTMLAnchorElement \| HTMLButtonElement>) => void` | — | Client Components only. With `url` it runs before navigation (it doesn't prevent it). |
| `className` | `string` | — | Extra classes on the anchor or button. |

## Server Components
Not a client component: render it from a Server Component with `url`. For client-side navigation, wrap the app once in `PolarisProvider` with `linkComponent={Link}` from `next/link` (in a `'use client'` file); without it, internal URLs do full page loads. `onClick` — with or without `url` — needs a Client Component.

## Accessibility
- The 2px `border-focus` outline is built in; without `url` it's a real `<button>`, so assistive tech announces it as an action.
- When a new tab matters, say so in or next to the link text ("opens in a new tab").
