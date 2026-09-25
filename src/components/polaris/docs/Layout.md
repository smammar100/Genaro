# Layout

Arranges cards into the standard page columns: full width, two-thirds plus one-third, halves, and annotated sections for settings pages.

```tsx
import { Layout, LayoutSection, LayoutAnnotatedSection } from '@/components/polaris';
```

## Use it for
- Detail pages. Put the main content in a default `Layout.Section` and follow it with a `Layout.Section variant="oneThird"`. The pair becomes a two-thirds column (min 320px) and a one-third column (min 220px), 20px apart (`space-500`). The wide column holds the primary content; the narrow one holds summaries and metadata.
- `variant="oneHalf"` for two equal columns (min 280px each).
- Settings pages. Use `Layout.AnnotatedSection` with a `title` and `description`: the annotation (about 220–320px) sits on the left and the cards on the right, stacking once the row is narrower than about 640px.
- Columns wrap onto separate rows when there's no room for their minimum widths; a two-thirds/one-third pair needs about 690px of content width. Inside a `Page` narrower than about 690px (a container query on the Page), every section takes the full width, which is the phone layout.
- Each section stacks its children 16px apart (`space-400`), so put several Cards in one section.
- `Layout.Section` is also exported as `LayoutSection`, and `Layout.AnnotatedSection` as `LayoutAnnotatedSection`.
- Use `Grid` for dashboards and tile layouts, and Layout for standard page columns.

## Examples

A detail page with main content and a sidebar:

```tsx
<Page title="#1020" backAction={{ content: 'Orders', url: '/orders' }}>
  <Layout>
    <Layout.Section>
      <Card title="Unfulfilled">Mid-century armchair × 1</Card>
      <Card title="Paid">Subtotal $969.44</Card>
    </Layout.Section>
    <Layout.Section variant="oneThird">
      <Card title="Customer">Jaydon Stanton</Card>
      <Card title="Tags">Wholesale</Card>
    </Layout.Section>
  </Layout>
</Page>
```

A settings page with annotated sections. A `TextField` with `name` and `defaultValue` renders fine from a Server Component:

```tsx
<Page title="Store details" backAction={{ content: 'Settings', url: '/settings' }}>
  <Layout>
    <Layout.AnnotatedSection
      title="Store details"
      description="Shopify and your customers will use this information to contact you."
    >
      <Card>
        <TextField label="Store name" name="storeName" defaultValue="Stellar Interiors" />
      </Card>
    </Layout.AnnotatedSection>
    <Layout.AnnotatedSection title="Store address" description="This address will appear on your invoices.">
      <Card>
        <TextField label="Address" name="address" defaultValue="150 Elgin Street, Ottawa" />
      </Card>
    </Layout.AnnotatedSection>
  </Layout>
</Page>
```

Halves, using the flat names:

```tsx
<Layout>
  <LayoutSection variant="oneHalf">
    <Card title="Online Store">Last order 5 minutes ago</Card>
  </LayoutSection>
  <LayoutSection variant="oneHalf">
    <Card title="Point of Sale">Last order yesterday</Card>
  </LayoutSection>
</Layout>
```

## Props

`Layout`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | Sections and annotated sections. |
| `className` | `string` | — | |

`Layout.Section` / `LayoutSection`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'fullWidth' \| 'oneHalf' \| 'oneThird'` | `'fullWidth'` | `fullWidth` followed by `oneThird` gives two-thirds plus one-third. |
| `secondary` | `boolean` | — | Deprecated. Use `variant="oneThird"`. |
| `oneHalf` | `boolean` | — | Deprecated. Use `variant="oneHalf"`. |
| `children` | `ReactNode` | — | Stacked 16px apart. |
| `className` | `string` | — | |

`Layout.AnnotatedSection` / `LayoutAnnotatedSection`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | — | Required. `<h2>`, 14px semibold. |
| `description` | `ReactNode` | — | `text-secondary`, under the title. |
| `children` | `ReactNode` | — | Cards, stacked 16px apart. |
| `className` | `string` | — | |

## Server Components
Layout is not a client component. All three parts render from Server Components, and the dot names (`Layout.Section`) and flat names (`LayoutSection`) both work everywhere.
