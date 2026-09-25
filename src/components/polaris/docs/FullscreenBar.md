# FullscreenBar

A 56px white header for full-screen editors. It has an Exit button (`ExitMajor`), a title with an optional badge, and actions on the right.

```tsx
import { FullscreenBar } from '@/components/polaris';
```

## Use it for
- Immersive tasks that hide the admin navigation, such as a theme editor or a bulk editor. Render it at the top of a route that doesn't use the `Frame`, for example its own route group `app/(editor)/…`, rather than inside the Frame.
- `title` names the thing being edited. `badge` takes Badge props plus `content`, e.g. `{ tone: 'info', content: 'Draft' }`.
- Pass the actions as children: a secondary Button and one primary Button (e.g. "Preview" and "Publish"). They sit 8px apart.
- Exit calls `onAction`. There's no `url` prop, so navigate from the handler with `router.push()` or `router.back()`.

## Examples

An editor bar (Client Component):

```tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, FullscreenBar } from '@/components/polaris';

export function ThemeEditorBar() {
  const router = useRouter();
  const [publishing, setPublishing] = React.useState(false);
  return (
    <FullscreenBar title="Home page" badge={{ tone: 'info', content: 'Draft' }} onAction={() => router.push('/online-store/themes')}>
      <Button url="/online-store/preview">Preview</Button>
      <Button variant="primary" loading={publishing} onClick={() => setPublishing(true)}>
        Publish
      </Button>
    </FullscreenBar>
  );
}
```

The editor's route layout, outside the admin `Frame`. The layout can stay a Server Component:

```tsx
// app/(editor)/online-store/editor/layout.tsx
import { ThemeEditorBar } from './ThemeEditorBar';

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <ThemeEditorBar />
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>{children}</div>
    </div>
  );
}
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `onAction` | `() => void` | — | Called by the Exit button. Client Components only. |
| `title` | `ReactNode` | — | Semibold, next to the Exit button. |
| `badge` | `BadgeProps & { content: string }` | — | A Badge after the title. |
| `children` | `ReactNode` | — | Actions on the right. |
| `className` | `string` | — | Extra classes on the root. |

## Server Components
FullscreenBar is not a client component, but Exit only works through `onAction`, so render it from a Client Component such as `ThemeEditorBar`. The layout around it can stay a Server Component.

## Accessibility
- Exit is a real `<button>` with visible "Exit" text.
- Give the editor's main area a heading, because the bar's title is not a heading element.
