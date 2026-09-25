# PageActions

The action row at the bottom of a detail page: primary action on the right, secondary and destructive actions on the left, above a top border.

```tsx
import { PageActions } from '@/components/polaris';
```

## Use it for
- Repeating the page's primary action ("Save") at the end of long forms, so merchants don't scroll back up.
- One destructive secondary action, usually "Delete product" / "Delete order" — it renders as a critical secondary button. Pair it with a confirmation `Modal`.
- Labels are verb + noun in sentence case; the destructive label names the object ("Delete order", not "Delete").

## Examples

Save a form — `submit: true` makes the primary button `type="submit"`, so it posts the surrounding `<form action={updateProduct}>` (a Server Action). `useFormStatus` (from `react-dom`) drives the loading state and must render inside the form; `confirmDelete` opens your confirmation Modal:

```tsx
'use client';
function ProductPageActions() {
  const { pending } = useFormStatus();
  return (
    <PageActions
      primaryAction={{ content: 'Save', submit: true, loading: pending }}
      secondaryActions={[{ content: 'Delete product', destructive: true, onAction: confirmDelete }]}
    />
  );
}

<form action={updateProduct}>
  {/* product fields */}
  <ProductPageActions />
</form>
```

Navigation-only actions — works from a Server Component:

```tsx
<PageActions
  primaryAction={{ content: 'Collect payment', url: '/draft_orders/1042/payment' }}
  secondaryActions={[{ content: 'Send invoice', url: '/draft_orders/1042/invoice' }]}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `primaryAction` | `Action & { disabled?: boolean; loading?: boolean; submit?: boolean }` | — | Right-aligned primary button: `content`, `onAction`, `url`, `external`, `submit` (`type="submit"`), `disabled`, `loading`, `accessibilityLabel`. |
| `secondaryActions` | `Array<Action & { destructive?: boolean; disabled?: boolean }>` | — | Left-aligned secondary buttons: `content`, `onAction`, `url`, `external`, `disabled`, `accessibilityLabel`; `destructive` makes one critical. |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Not a client component: from a Server Component use `url` actions and `submit: true` inside `<form action={serverAction}>`. `onAction` and hook-driven `loading` need a Client Component.
