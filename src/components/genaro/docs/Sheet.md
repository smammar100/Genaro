# Sheet

A panel that slides in from the right over a backdrop, for a record's details or a longer form beside the page. It has the Modal's `bg-surface`, `radius-500` corners and `shadow-600`, sits 8px in from the window's edges, and has a `bg-surface-tertiary` header with a close button, a body that scrolls, and an optional footer for the actions.

```tsx
import { Sheet } from '@/components/genaro';
```

## Use it for
- A record that has no page of its own, or that people check without leaving a list: a deal from the pipeline, a warranty, a vehicle's location history, a car's to-do list.
- A form too long for a Modal that should keep the list in view, such as booking an appointment or an inspection checklist.
- Not for confirmations or one-field tasks (use `Modal`), a menu of actions (use `ActionMenu`) or anything people work in for a long time (give it a page).
- The `title` names the record or the task ("Location history", a customer's name). It can hold a reg plate or a link. `titleMetadata` puts badges after it, such as a deal's stage. `subtitle` adds one caption line underneath, saying which record this is ("L-927 · Ford Fiesta").
- `headerActions` are tertiary buttons before the close button, such as "Open vehicle". Keep them to one or two. An action without `content` is icon-only and needs an `accessibilityLabel`.
- The footer holds `primaryAction`, the sheet's one main action, and `secondaryActions` before it. A `destructive` secondary action is critical and moves to the footer's start, away from the primary. For a footer that needs more than buttons, such as Tooltips explaining why an action is disabled, pass your own `footer` instead.
- Widths: 480px by default, 380px with `size="small"`, 672px with `size="large"` (wide checklists and tables). The sheet is never wider than the window less 48px, so a sliver of the page always shows.
- The body is padded 16px and stacks its children 16px apart. Set `background="subdued"` for a stack of Cards on `bg-surface-secondary`, and `padding="0"` for a full-bleed list.
- You control it with `open`. `onClose` fires on Escape, on a backdrop click and on the close button; set `open` to `false` there. Keep the record it shows until it has slid out, or the panel empties as it leaves.

## Examples

A deal's details from the pipeline, with its stage beside the name and a link to invoicing (Client Component):

```tsx
'use client';
const [deal, setDeal] = React.useState<Deal | null>(null);

<Sheet
  open={deal !== null}
  onClose={() => setDeal(null)}
  title={deal?.customerName}
  titleMetadata={<Badge tone="success">Deposit taken</Badge>}
  subtitle="Deal opened 14 Oct 2026"
  background="subdued"
  primaryAction={{ content: 'Generate invoice', icon: 'OrdersMinor', url: '/sales/invoice-generation?vehicleId=L-927' }}
>
  <Card title="Vehicle">
    <p className="body-md">OY70 TZG · 2020 Ford Fiesta</p>
  </Card>
  <Card title="Deal">
    <DescriptionList items={[{ term: 'Agreed price', description: '£16,419.00' }, { term: 'Deposit', description: '£500.00' }]} />
  </Card>
</Sheet>
```

A form with a footer. Create submits the form with `requestSubmit()`, and Discard closes the sheet:

```tsx
'use client';
const formRef = React.useRef<HTMLFormElement>(null);
const [open, setOpen] = React.useState(false);
const [saving, setSaving] = React.useState(false);

<Sheet
  open={open}
  onClose={() => setOpen(false)}
  title="New appointment"
  primaryAction={{ content: 'Book appointment', loading: saving, onAction: () => formRef.current?.requestSubmit() }}
  secondaryActions={[{ content: 'Discard', onAction: () => setOpen(false) }]}
>
  <form
    ref={formRef}
    action={async (formData) => {
      setSaving(true);
      await bookAppointment(formData);
      setSaving(false);
      setOpen(false);
    }}
  >
    <TextField label="Customer name" name="customer" autoComplete="off" />
  </form>
</Sheet>
```

Your own footer, with Tooltips that say why an action is disabled:

```tsx
<Sheet
  open={open}
  onClose={close}
  title="External warranty"
  subtitle="Priya Shah"
  titleMetadata={<Badge tone="success">Active</Badge>}
  footer={
    <>
      <Tooltip content="Can only file claims on active warranties">
        <Button disabled>File claim</Button>
      </Tooltip>
      <Button variant="tertiary" tone="critical" onClick={confirmCancel}>
        Cancel warranty
      </Button>
    </>
  }
>
  …
</Sheet>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | — | Required. Slides the sheet in; `false` slides it out. |
| `onClose` | `() => void` | — | Required. Called on Escape, a backdrop click and the close button. |
| `title` | `ReactNode` | — | Required. The heading (title role) and the sheet's accessible name. |
| `subtitle` | `ReactNode` | — | One caption line under the title, `text-secondary`. Also the accessible description. |
| `titleMetadata` | `ReactNode` | — | Badges after the title. |
| `headerActions` | `SheetHeaderAction[]` | — | Tertiary buttons before the close button. Icon-only without `content`. |
| `primaryAction` | `SheetAction` | — | The primary footer button. Critical when `destructive`. |
| `secondaryActions` | `SheetAction[]` | — | Default footer buttons before the primary. Destructive ones are critical and move to the start. |
| `footer` | `ReactNode` | — | Your own footer content instead of the two action props. |
| `size` | `'small' \| 'large'` | — | Maximum width 380px or 672px. 480px when unset. |
| `background` | `'default' \| 'subdued'` | `'default'` | `subdued` puts the body on `bg-surface-secondary`. |
| `padding` | `'0' \| '400'` | `'400'` | `'0'` removes the body's padding and the gap between its children. |
| `children` | `ReactNode` | — | The body. It scrolls between the header and the footer. |
| `className` | `string` | — | Extra classes on the panel. |

`SheetAction` is an `Action` plus `icon`, `loading`, `disabled` and `destructive`. `SheetHeaderAction` is the same without `destructive`, and with `content` optional.

## Motion
The panel slides in over 250ms and out over 180ms on `cubic-bezier(0.32, 0.72, 0, 1)`, and the backdrop fades with it. It stays mounted until the slide-out finishes, and reopening mid-slide reverses it. With `prefers-reduced-motion` it appears and disappears without moving.

## Server Components
Sheet is a client component and runs on state (`open`, `onClose`), so use it from a Client Component. Action `url`s still navigate without a handler.

## Accessibility
- The panel has `role="dialog"` and `aria-modal`, is labelled by the title and described by the subtitle.
- Opening moves focus into the panel (an `autoFocus` field inside keeps it), Tab and Shift+Tab cycle through its controls, page scroll is locked, and closing returns focus to the element that opened it.
- Popovers opened inside it take Escape first, and a Modal opened from it (such as a `useConfirm` confirmation) stacks above it and takes Escape and Tab until it closes. Don't open a Sheet from a Modal.
- Icon-only header actions need an `accessibilityLabel`.
