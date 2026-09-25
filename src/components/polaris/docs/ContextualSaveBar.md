# ContextualSaveBar

The unsaved-changes bar on `bg-inverse`: a `RiskMinor` icon and a message on the left, and Discard and Save buttons on the right. It takes the place of the top bar's search while a form is dirty.

```tsx
import { ContextualSaveBar } from '@/components/polaris';
```

## Use it for
- Pass its props to `Frame contextualSaveBar`, or to `TopBar contextualSaveBar` when there's no Frame. Pass them only while there are unsaved changes, and `undefined` otherwise.
- Keep Save `disabled` until the form is valid, and set `saveAction.loading` while saving; that disables it and sets `aria-busy`.
- `message` defaults to "Unsaved changes". The button labels fall back to "Save" and "Discard" only when `content` is an empty string.
- `formId` makes Save a `type="submit"` button for the `<form id>` elsewhere on the page. It even works from the top bar, so a form with a Server Action needs no submit code. Without `formId`, Save runs `saveAction.onAction`. Discard always runs `onAction`. Action `url`s are ignored.
- Inside a top bar narrower than 768px, the message text is hidden and only the icon stays.
- Rendered standalone, it's a 56px bar with its own background and 16px side padding, for custom headers and previews.

## Examples

Through the Frame, the usual placement. Dirty state is derived from the saved value, and Save stays disabled while the title is empty (Client Component):

```tsx
'use client';
const [savedTitle, setSavedTitle] = React.useState('Mid-century armchair');
const [title, setTitle] = React.useState(savedTitle);

<Frame
  topBar={<TopBar logo="Stellar Interiors" storeName="Stellar Interiors" />}
  contextualSaveBar={
    title !== savedTitle
      ? {
          message: 'Unsaved product',
          saveAction: { content: 'Save', disabled: !title.trim(), onAction: () => setSavedTitle(title) },
          discardAction: { content: 'Discard', onAction: () => setTitle(savedTitle) },
        }
      : undefined
  }
>
  <Page title={savedTitle} backAction={{ content: 'Products', url: '/products' }}>
    <Card>
      <TextField label="Title" value={title} onChange={setTitle} error={title.trim() ? undefined : 'Enter a title'} />
    </Card>
  </Page>
</Frame>
```

A form wired to a Server Action (`updateProduct`) through `formId`. Save submits the form and shows its loading state from `useActionState`. Discard remounts the form so the fields go back to their defaults:

```tsx
'use client';
const [dirty, setDirty] = React.useState(false);
const [formKey, setFormKey] = React.useState(0);
const [, save, saving] = React.useActionState(async (_state: null, formData: FormData) => {
  await updateProduct(formData);
  setDirty(false);
  return null;
}, null);

<>
  {dirty ? (
    <ContextualSaveBar
      formId="product-form"
      saveAction={{ content: 'Save', loading: saving }}
      discardAction={{
        content: 'Discard',
        onAction: () => {
          setFormKey((key) => key + 1);
          setDirty(false);
        },
      }}
    />
  ) : null}
  <form id="product-form" key={formKey} action={save} onChange={() => setDirty(true)}>
    <Card>
      <TextField label="Title" name="title" defaultValue="Mid-century armchair" />
    </Card>
  </form>
</>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `message` | `string` | `'Unsaved changes'` | Semibold, next to the `RiskMinor` icon. |
| `saveAction` | `Action & { disabled?: boolean; loading?: boolean }` | — | White "Save" button. Uses `content`, `onAction`, `disabled` and `loading`. |
| `discardAction` | `Action` | — | Dark "Discard" button. Uses `content` and `onAction`. |
| `formId` | `string` | — | `id` of the form that Save submits (`type="submit" form={formId}`). |
| `className` | `string` | — | Extra classes on the root. |

## Server Components
ContextualSaveBar is not a client component. With `formId`, Save needs no callback, but Discard and the "is the form dirty?" state still do, so build its props in a Client Component. Frame and TopBar are client components too, which means the `contextualSaveBar` object you pass them usually comes from a Client Component as well.
