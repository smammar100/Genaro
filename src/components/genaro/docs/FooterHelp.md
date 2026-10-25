# FooterHelp

A centered help line at the bottom of a page, linking to documentation.

```tsx
import { FooterHelp, Link } from '@/components/genaro';
```

## Use it for
- The last child of a `Page`, after the cards. It adds its own 16px padding (`space-400`), so it needs no wrapper.
- Start with "Learn more about" and link the topic. The link text names the destination, never "click here".
- The children are text plus a Genaro `Link`. In a file that also imports `next/link`, import the Genaro one as `{ Link as GenaroLink }`.
- The text is 13px medium in `text`, centered.

## Examples

At the end of a page, with an internal link (it navigates client-side through `GenaroProvider`):

```tsx
<Page title="#1020" backAction={{ content: 'Orders', url: '/orders' }}>
  <Card title="Unfulfilled">Mid-century armchair × 1</Card>
  <FooterHelp>
    Learn more about <Link url="/help/fulfilling-orders">fulfilling orders</Link>
  </FooterHelp>
</Page>
```

An external help article, opened in a new tab:

```tsx
<FooterHelp>
  Learn more about <Link url="https://www.gov.uk/vat-margin-schemes" external>VAT margin schemes</Link>
</FooterHelp>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | "Learn more about" plus a `Link`. |
| `className` | `string` | — | Extra classes on the root. |

## Server Components
FooterHelp is not a client component and can render anywhere. An internal `Link` inside it still navigates client-side when `GenaroProvider` is set up.
