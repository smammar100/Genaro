# Tag

A keyword attached to an object — plain, removable (×) or clickable (the file's Tag, Removable tag and Clickable tag sets).

```tsx
import { Tag } from '@/components/polaris';
```

## Use it for
- Merchant-entered keywords: product tags, customer tags, collection conditions. System status is a `Badge`.
- `onRemove` while editing (adds the × button); `onClick` for tags that do something, such as adding a suggested tag.
- Keep labels short — long ones truncate with an ellipsis (non-clickable tags with a string label show the full text on hover).
- `magic` only while Sidekick is suggesting or writing the tag.

## Examples

Static tags — work from a Server Component:

```tsx
<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-200)' }}>
  <Tag>Wholesale</Tag>
  <Tag>Summer collection</Tag>
  <Tag>Walnut</Tag>
</div>
```

Removable (Client Component):

```tsx
'use client';
const [tags, setTags] = React.useState(['Wholesale', 'Summer collection', 'Walnut']);

<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-200)' }}>
  {tags.map((tag) => (
    <Tag key={tag} onRemove={() => setTags((current) => current.filter((t) => t !== tag))}>
      {tag}
    </Tag>
  ))}
</div>
```

Clickable suggestions (`addTag` is your handler):

```tsx
<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-200)' }}>
  {['Mid-century', 'Living room', 'Armchairs'].map((tag) => (
    <Tag key={tag} onClick={() => addTag(tag)}>
      {tag}
    </Tag>
  ))}
</div>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | The label. |
| `onRemove` | `() => void` | — | Adds a × button labelled "Remove {label}". Ignored when `onClick` is set. |
| `onClick` | `() => void` | — | Renders the whole tag as a button (no × button). |
| `disabled` | `boolean` | — | Disables the × or the clickable tag. |
| `accessibilityLabel` | `string` | — | Names the × button: "Remove {accessibilityLabel}". Without it: "Remove {children}" for string labels, otherwise "Remove tag". |
| `magic` | `boolean` | — | Sidekick state. |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Not a client component: static tags render anywhere. `onRemove` and `onClick` need a Client Component.

## Accessibility
- The × and clickable tags show the 2px `border-focus` ring.
- A tag can't be both clickable and removable; if you need both, put a separate remove button next to it.
