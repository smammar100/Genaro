# Modal

A dialog for focused tasks and confirmations. It has `radius-500` corners and `shadow-600`, a `bg-surface-tertiary` header with a close button, and a bordered footer for the actions.

```tsx
import { Modal } from '@/components/polaris';
```

## Use it for
- Confirmations and short, focused tasks. The title states the task as a question or an action: "Delete 3 products?".
- For a destructive confirmation, set `primaryAction.destructive` to get a critical primary button. Other actions go in `secondaryActions`, which render to the left of the primary button.
- Maximum widths: 620px by default, 380px with `size="small"`, 980px with `size="large"`. The dialog is at most the viewport height minus 32px, and the body scrolls inside it.
- You control it with `open`. `onClose` fires on Escape, on a backdrop click and on the header's close button; set `open` to `false` there. The close button only appears when there is a `title`.
- Once mounted, it portals to `<body>` over a `backdrop-bg` scrim (z-index 500), so nothing renders on the server. While open, it moves focus into the dialog, keeps Tab inside it, locks page scroll, and returns focus to the previously focused element when it closes.
- `inline` renders it in place instead, with no portal, backdrop, focus handling or Escape (for docs and previews).

## Examples

A destructive confirmation (Client Component):

```tsx
'use client';
const [open, setOpen] = React.useState(false);
const [deleting, setDeleting] = React.useState(false);

<>
  <Button tone="critical" onClick={() => setOpen(true)}>
    Delete products
  </Button>
  <Modal
    open={open}
    onClose={() => setOpen(false)}
    title="Delete 3 products?"
    size="small"
    primaryAction={{ content: 'Delete products', destructive: true, loading: deleting, onAction: () => setDeleting(true) }}
    secondaryActions={[{ content: 'Cancel', onAction: () => setOpen(false) }]}
  >
    This can’t be undone. The products will be removed from every sales channel.
  </Modal>
</>
```

A short form. Save submits it with `requestSubmit()`, the form posts to a Server Action (`updateOrderNote`), and the modal closes once the action finishes:

```tsx
'use client';
const formRef = React.useRef<HTMLFormElement>(null);
const [open, setOpen] = React.useState(false);
const close = () => setOpen(false);

<Modal
  open={open}
  onClose={close}
  title="Edit note"
  primaryAction={{ content: 'Save note', onAction: () => formRef.current?.requestSubmit() }}
  secondaryActions={[{ content: 'Cancel', onAction: close }]}
>
  <form
    ref={formRef}
    action={async (formData) => {
      await updateOrderNote(formData);
      close();
    }}
  >
    <TextField label="Note" labelHidden name="note" multiline defaultValue="Customer asked for delivery after 5 pm." />
  </form>
</Modal>
```

Actions can link instead of calling code, because `url` works without a handler. `external` opens the link in a new tab:

```tsx
'use client';
const [open, setOpen] = React.useState(false);

<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Reach more shoppers with Instagram product tags"
  primaryAction={{ content: 'Add Instagram', url: '/apps/instagram' }}
  secondaryActions={[{ content: 'Learn more', url: 'https://help.instagram.com/', external: true }]}
>
  Use Instagram posts to share your products with millions of people.
</Modal>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | — | Required. Nothing renders while it is `false`. |
| `onClose` | `() => void` | — | Called on Escape, a backdrop click and the close button. |
| `title` | `string` | — | Header title and the dialog's `aria-label`. Without it there is no header and no close button. |
| `children` | `ReactNode` | — | The body, padded 16px. It scrolls. |
| `primaryAction` | `Action & { destructive?: boolean; loading?: boolean; disabled?: boolean }` | — | Primary button, critical when `destructive`. Uses `content`, `onAction`, `url` and `external`. |
| `secondaryActions` | `Action[]` | — | Default buttons placed before the primary. Uses `content`, `onAction`, `url` and `external`. |
| `size` | `'small' \| 'large'` | — | Maximum width 380px or 980px. 620px when unset. |
| `inline` | `boolean` | — | Renders in place, with no portal, backdrop, focus handling or Escape. |
| `className` | `string` | — | Extra classes on the dialog. |

## Server Components
Modal is a client component and always runs on state (`open`, `onClose`), so use it from a Client Component. Action `url`s still navigate without a handler.

## Accessibility
- The dialog has `role="dialog"` and `aria-modal`, and `title` supplies its label, so always pass a title.
- Opening focuses the dialog, Tab and Shift+Tab cycle through its controls, and closing returns focus to the element that opened it (usually the trigger button), so there's no focus code to write.
