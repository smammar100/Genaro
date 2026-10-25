# ConfirmModal

A small dialog that asks one yes-or-no question before an action happens: the title asks, the description says what will change, and the primary button answers with a verb + noun. It's a `Modal` with `size="small"`, a Cancel button and a primary button that's critical for destructive actions. `useConfirm` wraps it in a promise, as a drop-in for `window.confirm`.

```tsx
import { ConfirmModal, useConfirm } from '@/components/genaro';
```

## Use it for
- Confirming an action that deletes something or can't be undone ("Delete lead?"), with `destructive` for a primary critical button.
- Checking before an unusual step that is allowed but probably a mistake ("Registration already on the Master Sheet", "Add anyway").
- Not for routine actions people take all day: confirming every save trains people to click through. Not for a question that needs an answer typed in, such as a reason for cancelling a warranty: use a `Modal` with the field.
- `title` asks the question in sentence case and ends with a question mark when it is one. `description` says what will happen and whether it can be undone. `confirmText` repeats the action as a verb + noun ("Delete lead", not "OK" or "Yes"); it falls back to "Confirm" only for old call sites. `cancelText` defaults to "Cancel".
- **`useConfirm()`** returns `confirm(options)`, which opens the dialog and resolves `true` on confirm and `false` on cancel, the close button, Escape or a backdrop click, and `confirmDialog`, which you render once in the component. Calling `confirm()` again before the first is answered resolves the first `false`; so does unmounting.
- **`ConfirmModal`** is the same dialog driven by props, for when the action should run with the dialog still open: set `loading` while it runs (the confirm button shows a spinner and the dialog can't be dismissed), then close it.

## Examples

`useConfirm` before deleting a lead (Client Component):

```tsx
'use client';
const { confirm, confirmDialog } = useConfirm();

async function deleteLead() {
  const ok = await confirm({
    title: 'Delete lead?',
    description: 'Priya Shah’s lead and her 2 appointments will be deleted. This can’t be undone.',
    confirmText: 'Delete lead',
    destructive: true,
  });
  if (!ok) return;
  await leadService.remove(lead.id);
}

return (
  <>
    <Button tone="critical" onClick={deleteLead}>
      Delete lead
    </Button>
    {confirmDialog}
  </>
);
```

A check before an unusual step, with a default (not critical) primary button:

```tsx
const proceed = await confirm({
  title: 'Registration already on the Master Sheet',
  description: 'OY70 TZG already exists (L-927, Ford Fiesta). Add anyway?',
  confirmText: 'Add anyway',
});
```

`ConfirmModal` with the dialog open until the deletion finishes:

```tsx
'use client';
const [open, setOpen] = React.useState(false);
const [deleting, setDeleting] = React.useState(false);

<ConfirmModal
  open={open}
  title="Delete this £1,240.00 invoice?"
  description="This can’t be undone."
  confirmText="Delete invoice"
  destructive
  loading={deleting}
  onCancel={() => setOpen(false)}
  onConfirm={async () => {
    setDeleting(true);
    await externalInvoiceService.delete(invoice.id);
    setDeleting(false);
    setOpen(false);
  }}
/>
```

## Props

`ConfirmModal`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | — | Required. Shows the dialog. |
| `title` | `string` | — | Required. The question, and the dialog's accessible name. |
| `description` | `ReactNode` | — | What will happen and whether it can be undone. |
| `confirmText` | `string` | `'Confirm'` | The primary button: a verb + noun. |
| `cancelText` | `string` | `'Cancel'` | The secondary button. |
| `destructive` | `boolean` | — | Makes the primary button critical. |
| `loading` | `boolean` | — | Spinner on the primary button; Cancel, Escape and the backdrop do nothing until it clears. |
| `onConfirm` | `() => void` | — | Required. Called by the primary button. |
| `onCancel` | `() => void` | — | Required. Called by Cancel, the close button, Escape and a backdrop click. |

`useConfirm(): { confirm, confirmDialog }`

| Field | Type | Notes |
|---|---|---|
| `confirm` | `(options: ConfirmOptions) => Promise<boolean>` | `ConfirmOptions` is `{ title, description?, confirmText?, cancelText?, destructive? }`. |
| `confirmDialog` | `ReactElement` | Render it once in the component that calls `confirm`. |

## Server Components
Both are client-only: they run on state and callbacks, so use them from a Client Component.

## Accessibility
- It's a `Modal`: `role="dialog"` with `aria-modal`, labelled by the title. Opening focuses the dialog rather than the confirm button, so Enter can't confirm a destructive action by accident; Tab reaches the close button and Cancel before the confirm button.
- Closing returns focus to the element that opened it, usually the button or menu that asked.
- Opened from a `Sheet`, it stacks above the sheet and takes Escape and Tab until it closes.
