# Button

Triggers an action or navigates. One component covers the file's Default, Primary, Critical, Success, Tertiary, Plain and Icon button sets.

```tsx
import { Button } from '@/components/polaris';
```

## Use it for
- The page's main action with `variant="primary"` — only **one primary per view** (e.g. "Save").
- Everything else with the default `secondary` variant; `tertiary` for low-emphasis actions inside cards and banners; `plain` for inline, link-like actions.
- `tone="critical"` only for destructive actions — pair a primary critical button with a confirmation `Modal`. `tone="success"` for completing actions ("Mark as paid").
- Labels are verb + noun in sentence case: "Add product", never "Add Product" or "Click here".
- Sizes: `micro` 24px (dense rows), `medium` 28px (default), `large` 32px (empty states, onboarding).

## Examples

Primary and secondary — navigation via `url` works in Server Components; `submit` posts the surrounding `<form>`:

```tsx
<ButtonGroup>
  <Button url="/products">Cancel</Button>
  <Button variant="primary" submit>
    Save product
  </Button>
</ButtonGroup>
```

Destructive with a loading state (Client Component — it uses `onClick` and state):

```tsx
'use client';
const [deleting, setDeleting] = React.useState(false);

<Button variant="primary" tone="critical" loading={deleting} onClick={() => setDeleting(true)}>
  Delete order
</Button>
```

Icon, disclosure, icon-only and plain:

```tsx
<ButtonGroup>
  <Button icon="PlusMinor" variant="primary" url="/products/new">
    Add product
  </Button>
  <Button disclosure>More actions</Button>
  <Button icon="EditMinor" accessibilityLabel="Edit" />
  <Button variant="plain">View details</Button>
</ButtonGroup>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | The label. |
| `variant` | `'primary' \| 'secondary' \| 'tertiary' \| 'plain' \| 'monochromePlain'` | `'secondary'` | One `primary` per view. |
| `tone` | `'critical' \| 'success'` | — | Destructive / completing actions. |
| `size` | `'micro' \| 'medium' \| 'large'` | `'medium'` | 24 / 28 / 32px tall. |
| `icon` | `IconSource` | — | Icon name (`'PlusMinor'`) or any React element. |
| `disclosure` | `boolean \| 'up' \| 'down'` | — | Trailing chevron for menus. |
| `pressed` | `boolean` | — | Toggle-button state (`aria-pressed`). |
| `loading` | `boolean` | — | Shows a spinner and disables the button. |
| `disabled` | `boolean` | — | |
| `fullWidth` | `boolean` | — | Fills the container. |
| `textAlign` | `'left' \| 'center'` | — | |
| `url` | `string` | — | Renders a link; internal URLs use the router link from `PolarisProvider`. |
| `external` | `boolean` | — | Opens `url` in a new tab. |
| `submit` | `boolean` | — | `type="submit"`. |
| `onClick` | `(event) => void` | — | Client Components only. |
| `accessibilityLabel` | `string` | — | Required for icon-only buttons. |
| `testId` | `string` | — | Rendered as `data-testid`. Every `Action` object (Page, PageActions, Modal, ContextualSaveBar actions) takes `testId` too. |
| `id` | `string` | — | DOM id on the button or link, for example an onboarding-tour anchor. Every `Action` object (Page actions including `backAction` and secondary actions, PageActions, Modal, ContextualSaveBar) takes `id` too. |
| `title` | `string` | — | Native tooltip text. |
| `data-*` | `string` | — | Any `data-*` attribute (e.g. `data-tour="save"`) is passed through to the button or link. |
| `ariaExpanded` | `boolean` | — | For disclosure buttons that open a menu or panel. |
| `ariaControls` | `string` | — | id of the element the button controls. |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Not a client component itself: render it from a Server Component with `url` or `submit`. Pass `onClick` only from a Client Component.

## Accessibility
- Icon-only buttons need `accessibilityLabel`.
- The 2px `border-focus` outline (1px offset) is built in — don't remove it.
