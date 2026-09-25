# Frame

The admin app shell: a 56px `TopBar` on `bg-inverse`, the 240px `Navigation` on `nav-bg`, and a scrolling main area on `bg`.

```tsx
import { Frame, Navigation, TopBar } from '@/components/polaris';
```

## Use it for
- One Frame per app, rendered by `app/(admin)/layout.tsx`. Each route below it renders a `Page`, which becomes the Frame's children inside `<main>`.
- `topBar` takes a `<TopBar />` and `navigation` a `<Navigation />`. Frame adds the TopBar's hamburger (`onNavigationToggle`) itself.
- Frame is `height: 100%` of its parent. Pass `height="100dvh"` (or give the parent a height) so only the main area scrolls. Without that, the whole document scrolls and the top bar scrolls away with it.
- The navigation is docked when **the Frame itself** is at least 1040px wide. This is a container query, not a viewport breakpoint. Below that width the nav becomes a drawer: the `MobileHamburgerMajor` button slides it in over a `backdrop-bg` scrim, and clicking the scrim or any nav link closes it.
- Set `contextualSaveBar` (ContextualSaveBar props) while a form has unsaved changes. It replaces the top bar's search. Pass `undefined` the rest of the time. Its `formId` lets Save submit a `<form id>` inside the page.
- The kit's reference shell is `kit/examples/_shell/NextAdminShell.tsx`, together with `AdminShell.tsx`, `AdminNavigation.tsx` and `nav.ts`. `nav.ts` holds the full admin nav and `navSelectionFromPath()`. Copy these files rather than rebuilding the nav.

## Examples

The App Router shell. `layout.tsx` stays a Server Component and renders a small client wrapper that reads the URL:

```tsx
// app/(admin)/layout.tsx
import { AdminFrame } from './AdminFrame';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminFrame>{children}</AdminFrame>;
}
```

```tsx
// app/(admin)/AdminFrame.tsx
'use client';

import { usePathname } from 'next/navigation';
import { Frame, Navigation, TopBar } from '@/components/polaris';

export function AdminFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const at = (url: string) => pathname === url || pathname.startsWith(`${url}/`);
  return (
    <Frame
      height="100dvh"
      topBar={<TopBar logo="Stellar Interiors" storeName="Stellar Interiors" />}
      navigation={
        <Navigation>
          <Navigation.Section
            fill
            items={[
              { label: 'Home', icon: 'HomeMinor', url: '/', selected: pathname === '/' },
              { label: 'Orders', icon: 'OrdersMinor', url: '/orders', badge: '15', selected: at('/orders') },
              { label: 'Products', icon: 'ProductsMinor', url: '/products', selected: at('/products') },
              { label: 'Customers', icon: 'CustomersMinor', url: '/customers', selected: at('/customers') },
            ]}
          />
          <Navigation.Section items={[{ label: 'Settings', icon: 'SettingsMinor', url: '/settings', selected: at('/settings') }]} />
        </Navigation>
      }
    >
      {children}
    </Frame>
  );
}
```

Unsaved changes: the save bar replaces the search while `contextualSaveBar` is set. This needs a Client Component. In a real app the Frame lives in the layout, so put the form's dirty state in a context that both `AdminFrame` and the page can reach:

```tsx
'use client';
const [dirty, setDirty] = React.useState(false);

<Frame
  height="100dvh"
  topBar={<TopBar logo="Stellar Interiors" storeName="Stellar Interiors" />}
  contextualSaveBar={
    dirty
      ? {
          saveAction: { content: 'Save', onAction: () => setDirty(false) },
          discardAction: { content: 'Discard', onAction: () => setDirty(false) },
        }
      : undefined
  }
>
  <Page title="Mid-century armchair" backAction={{ content: 'Products', url: '/products' }}>
    <Card>
      <TextField label="Title" defaultValue="Mid-century armchair" onChange={() => setDirty(true)} />
    </Card>
  </Page>
</Frame>
```

A sized container, such as a preview or an embedded panel. Frame responds to its own width, so at 375px it shows the hamburger even on a wide screen. `AdminNavigation` here is the kit's `_shell` example:

```tsx
<div style={{ width: 375, height: 640 }}>
  <Frame topBar={<TopBar logo="Stellar Interiors" storeName="Stellar Interiors" />} navigation={<AdminNavigation selected={['Orders']} />}>
    <Page title="Orders" fullWidth />
  </Frame>
</div>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `topBar` | `ReactElement<TopBarProps>` | — | A `<TopBar />`. Frame sets its `onNavigationToggle` when there is a `navigation`, and its `contextualSaveBar` when Frame has one. |
| `navigation` | `ReactElement` | — | A `<Navigation />`. Docked when the Frame is ≥ 1040px wide, a drawer below that. |
| `contextualSaveBar` | `ContextualSaveBarProps` | — | Replaces the top bar's search while set. |
| `height` | `number \| string` | — | Inline height (`'100dvh'`, `640`). Without it the Frame is `100%` of its parent. |
| `children` | `ReactNode` | — | Rendered in `<main>`. Usually a `Page`. |
| `className` | `string` | — | Extra classes on the root. |

## Server Components
Frame is a client component (`'use client'`) because it holds the drawer state. A Server Component can render it with element props and `height`. Two things need a Client Component: a `contextualSaveBar` (its actions carry callbacks) and nav selection read from the URL with `usePathname`. The usual setup is therefore a small client wrapper like `AdminFrame`. Pages passed through as `children` stay Server Components. `Navigation.Section` and `NavigationSection` both work.

## Accessibility
- Children render inside `<main>`, so don't add another `<main>` in your pages.
- The drawer toggle is a button labelled "Toggle menu".
