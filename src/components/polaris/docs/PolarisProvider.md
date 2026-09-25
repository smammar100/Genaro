# PolarisProvider

An optional app-level provider that sends every internal `url` through your router's link component. That covers Button, Link, Navigation items, IndexTable rows, Page and card actions, and every other component with a `url`. `UnstyledLink` is the anchor they all render, and you can use it for your own clickable elements.

```tsx
import { PolarisProvider, UnstyledLink } from '@/components/polaris';
```

## Use it for
- Client-side navigation in Next.js. Wrap the app once with `linkComponent={Link}` from `next/link`, and internal `url`s will prefetch and navigate without full page loads. Without the provider everything still works, but links are plain `<a>` tags that trigger full page loads.
- Set it up in a `'use client'` providers file rendered by `app/layout.tsx`, the usual App Router place for context providers. Server Component pages below it still render on the server.
- Which URLs are internal:
  - a `url` with no scheme (`/orders/1020`, `?page=2`) goes through `linkComponent`;
  - a URL with a scheme (`https:`, `mailto:`, `tel:`), or one starting with `//` or `#`, renders a plain `<a>`;
  - `external` always renders `<a target="_blank" rel="noopener noreferrer">`.
- `linkComponent` receives `href`, `target`, `rel` and the remaining anchor props (`className`, `onClick`, `aria-*`, `children`). Any component that renders an `<a>` from `href` works.
- Polaris `Link` and next/link's `Link` share a name. In a file that needs both, import the kit's as `{ Link as PolarisLink }`.

## Examples

The providers file:

```tsx
// app/providers.tsx
'use client';

import Link from 'next/link';
import { PolarisProvider } from '@/components/polaris';

export function Providers({ children }: { children: React.ReactNode }) {
  return <PolarisProvider linkComponent={Link}>{children}</PolarisProvider>;
}
```

The root layout. It is also where the kit's global CSS gets imported once (`styles/tokens.css` and `styles/components.css`, per the note in `index.ts`):

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

`UnstyledLink` for your own clickable elements. It uses the same routing rules and adds no styles:

```tsx
<UnstyledLink url="/orders?status=unfulfilled" style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
  <Card title="15 orders to fulfill">Ship them today to keep your delivery promise.</Card>
</UnstyledLink>
```

An external link, which opens in a new tab:

```tsx
<UnstyledLink url="https://help.shopify.com/manual/orders" external>
  Help Center
</UnstyledLink>
```

## Props

`PolarisProvider`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `linkComponent` | `LinkLikeComponent` | — | Router link for internal URLs. In Next.js, `Link` from `next/link`. |
| `children` | `ReactNode` | — | The app. |

`UnstyledLink` (also accepts every `<a>` attribute except `href`)

| Prop | Type | Default | Notes |
|---|---|---|---|
| `url` | `string` | — | Required. Internal URLs go through `linkComponent`. |
| `external` | `boolean` | — | Opens in a new tab with `rel="noopener noreferrer"`. |
| `target` / `rel` | `string` | — | Passed through. `external` fills them in when you leave them out. |
| `className`, `style`, `onClick`, `aria-*` … | — | — | Passed to the anchor. `onClick` works in Client Components only. |

## Server Components
PolarisProvider is a client component. Render it from a `'use client'` file like `app/providers.tsx` and wrap `{children}` with it in the root layout; those children stay Server Components. UnstyledLink is also a client component, because it reads the provider's context. A Server Component can render it with a `url`, but `onClick` needs a Client Component.

## Accessibility
- UnstyledLink renders a real `<a>`, so give it link text or an `aria-label`.
- Wrapping a whole card in a link makes the card's text the link text. Keep that text short, and don't nest other links or buttons inside.
