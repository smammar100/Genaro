# DropZone

A file upload area that accepts drag-and-drop or a click, styled like an input with a secondary "Add files" button.

```tsx
import { DropZone } from '@/components/polaris';
```

## Use it for
- Product media, CSV imports, attachments. State the accepted formats in `actionHint` ("Accepts .jpg, .png and .webp").
- Drag-over switches to `bg-surface-emphasis` with a `border-emphasis` outline; `error` uses `bg-surface-critical`.
- Sizes by prominence: `large` (160px min height) as a page's main media area, `medium` (100px, default), `small` (50px) inside forms.
- Show what was added (a list, `Thumbnail`s or the file name in `actionHint`) — the zone itself doesn't list files.

## Examples

Collect images (Client Component). `accept` filters dropped files too, so `onDrop` only receives images:

```tsx
'use client';
const [files, setFiles] = React.useState<File[]>([]);

<>
  <DropZone
    label="Product images"
    accept="image/*"
    actionTitle="Add images"
    actionHint="Accepts .jpg, .png and .webp"
    onDrop={(added) => setFiles((current) => [...current, ...added])}
  />
  <ul>
    {files.map((file) => (
      <li key={file.name}>{file.name}</li>
    ))}
  </ul>
</>
```

Post with a Server Action — a named DropZone writes dropped files into its file input, so dropped and picked files both post with the form (`importProducts` is a Server Action; `onDrop` just shows the chosen file):

```tsx
'use client';
const [file, setFile] = React.useState<File>();

<form action={importProducts}>
  <DropZone
    label="Import products"
    name="file"
    accept=".csv"
    allowMultiple={false}
    actionTitle="Add file"
    actionHint={file ? file.name : 'Accepts .csv'}
    size="small"
    onDrop={([added]) => setFile(added)}
  />
  <Button variant="primary" submit disabled={!file}>
    Upload and continue
  </Button>
</form>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | Text above the zone. |
| `onDrop` | `(files: File[]) => void` | — | Called with the accepted dropped files (possibly none) and with files picked in the dialog. |
| `accept` | `string` | — | e.g. `"image/*"`, `".csv"`, `"application/pdf"`. Filters the dialog and dropped files; validate on the server too. |
| `allowMultiple` | `boolean` | `true` | `false` keeps one file, from the dialog or a drop. |
| `actionTitle` | `string` | `'Add files'` | Button label. |
| `actionHint` | `string` | — | Accepted formats, below the button. |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 50 / 100 / 160px min height. |
| `error` | `string \| boolean` | — | A string renders an `InlineError`; `true` only styles the zone. |
| `disabled` | `boolean` | — | Blocks the dialog and drops. |
| `name` | `string` | — | Name of the hidden file input; each drop or pick replaces its files. |
| `className` | `string` | — | Extra classes on the root (layout only). |

## Server Components
Client component (`'use client'`). From a Server Component, a named DropZone inside `<form action={serverAction}>` already posts dropped and picked files — but gives no feedback about what was chosen. Add `onDrop` from a Client Component to show it, as above.

## Accessibility
- The zone is a `<label>` around a visually hidden file input: it's focusable, shows the 2px `border-focus` ring, and opens the dialog from the keyboard.
- The `label` text isn't associated with the input; the button text and hint are what screen readers announce, so make `actionTitle` specific ("Add images").
